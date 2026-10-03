// === Optional cloud backup ===
// The app is fully usable with this switched off. When it is on, local writes
// are pushed in the background and remote changes are merged by `updatedAt`
// (newest write wins). Nothing here ever blocks the UI.

import * as store from './store.js';
import { FIREBASE_CONFIG, SDK_VERSION, REMOTE_PREFIX, LEGACY_COLLECTIONS } from '../config/firebase.js';
import { debounce } from './util.js';

const BATCH_LIMIT = 400;

let fb = null;          // firebase namespace once loaded
let db = null;
let auth = null;
let loading = null;
let user = null;
let syncing = false;
let queued = false;
let wired = false;

export const state = {
  status: 'off',        // off | connecting | signed-out | ready | syncing | error
  email: null,
  uid: null,
  lastSync: null,
  error: null,
  pending: 0,
};

const listeners = new Set();
export function onStatus(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}
function publish(changes = {}) {
  Object.assign(state, changes);
  state.pending = countPending();
  listeners.forEach((fn) => {
    try { fn(state); } catch (err) { console.error('[sync] listener failed', err); }
  });
}

const countPending = () => store.STORE_NAMES.reduce((a, s) => a + store.dirtyDocs(s).length, 0);

const remote = (storeName) => `${REMOTE_PREFIX}${storeName}`;

// --- SDK loading ---------------------------------------------------------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function loadSdk() {
  if (fb) return fb;
  if (loading) return loading;
  loading = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
    await loadScript(`${base}/firebase-app-compat.js`);
    await Promise.all([
      loadScript(`${base}/firebase-auth-compat.js`),
      loadScript(`${base}/firebase-firestore-compat.js`),
    ]);
    fb = window.firebase;
    if (!fb) throw new Error('Firebase SDK unavailable');
    if (!fb.apps.length) fb.initializeApp(FIREBASE_CONFIG);
    db = fb.firestore();
    auth = fb.auth();
    // IndexedDB is our own source of truth; Firestore keeps no second copy.
    db.settings({ ignoreUndefinedProperties: true });
    return fb;
  })();
  return loading;
}

// --- Lifecycle -----------------------------------------------------------

/** Called at boot. Does nothing unless the user turned backup on. */
export async function init() {
  const settings = store.get('meta', 'settings');
  if (!settings || !settings.syncEnabled) {
    publish({ status: 'off' });
    return;
  }
  await connect();
}

export async function connect() {
  publish({ status: 'connecting', error: null });
  try {
    await loadSdk();
  } catch (err) {
    publish({ status: 'error', error: 'Could not reach Firebase. Working offline.' });
    return;
  }
  auth.onAuthStateChanged((u) => {
    user = u;
    if (!u) {
      publish({ status: 'signed-out', email: null, uid: null });
      return;
    }
    publish({ status: 'ready', email: u.email || null, uid: u.uid });
    (async () => {
      try {
        const reset = await resetCloudOnce();
        if (reset) {
          window.dispatchEvent(new CustomEvent('wl:cloud-reset', { detail: reset }));
        }
      } catch (err) {
        console.error('[sync] one-time reset failed', err);
        publish({ status: 'error', error: err.message || 'Could not reset the cloud database' });
        return;
      }
      sync({ pull: true });
    })();
  });
  if (!wired) {
    wired = true;
    store.on('change', scheduleSync);
    window.addEventListener('online', () => sync({ pull: true }));
  }
}

export async function signIn(email, password) {
  await loadSdk();
  await auth.signInWithEmailAndPassword(email, password);
  return auth.currentUser;
}

export async function signOut() {
  if (!auth) return;
  await auth.signOut();
  user = null;
  publish({ status: 'signed-out', email: null, uid: null });
}

export const isSignedIn = () => !!user;

/** The signed-in account's uid — paste this into firestore.rules to pin them. */
export const currentUid = () => (user ? user.uid : null);

/** Erase the cloud copy, then re-upload everything held on this device. */
export async function replaceCloudWithLocal() {
  if (!user || !db) throw new Error('Not signed in');
  const removed = await wipeRemote();
  await store.put('meta', { id: 'syncCursor', lastPullAt: Date.now() }, { silent: true });
  await store.clearDirty('meta', ['syncCursor']);
  const queuedCount = await store.markAllDirty();
  await sync({ pull: false });
  return { removed, uploaded: queuedCount };
}

const scheduleSync = debounce(() => sync({ pull: false }), 2500);

// --- Push / pull ---------------------------------------------------------

export async function sync({ pull = false } = {}) {
  if (!user || !db) return;
  if (syncing) {
    queued = true;
    return;
  }
  syncing = true;
  publish({ status: 'syncing' });
  try {
    if (pull) await pullAll();
    await pushAll();
    publish({ status: 'ready', lastSync: Date.now(), error: null });
  } catch (err) {
    console.error('[sync] failed', err);
    publish({ status: 'error', error: err.message || 'Sync failed' });
  } finally {
    syncing = false;
    if (queued) {
      queued = false;
      sync({ pull: false });
    }
  }
}

async function pushAll() {
  const root = db.collection('users').doc(user.uid);
  for (const name of store.STORE_NAMES) {
    const dirty = store.dirtyDocs(name);
    if (!dirty.length) continue;
    for (let i = 0; i < dirty.length; i += BATCH_LIMIT) {
      const chunk = dirty.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      chunk.forEach((doc) => {
        batch.set(root.collection(remote(name)).doc(doc.id), store.forWire(doc));
      });
      await batch.commit();
      await store.clearDirty(name, chunk.map((d) => d.id));
    }
  }
}

async function pullAll() {
  const root = db.collection('users').doc(user.uid);
  const cursor = store.get('meta', 'syncCursor');
  const since = cursor ? cursor.lastPullAt || 0 : 0;
  let applied = 0;
  let newest = since;

  for (const name of store.STORE_NAMES) {
    let query = root.collection(remote(name));
    if (since) query = query.where('updatedAt', '>', since);
    const snap = await query.get();
    for (const doc of snap.docs) {
      const data = { id: doc.id, ...doc.data() };
      if (data.updatedAt > newest) newest = data.updatedAt;
      // `meta/syncCursor` is device-local bookkeeping; never let it round-trip.
      if (name === 'meta' && data.id === 'syncCursor') continue;
      if (await store.applyRemote(name, data)) applied++;
    }
  }
  await store.put('meta', { id: 'syncCursor', lastPullAt: newest || Date.now() }, { silent: true });
  // The cursor itself must not look like user data waiting to be pushed.
  await store.clearDirty('meta', ['syncCursor']);
  if (applied) store.emit('change', { store: '*' });
  return applied;
}

/** Pull everything from scratch — used after signing in on a new device. */
export async function restoreFromCloud() {
  if (!user || !db) throw new Error('Not signed in');
  await store.put('meta', { id: 'syncCursor', lastPullAt: 0 }, { silent: true });
  await store.clearDirty('meta', ['syncCursor']);
  const applied = await pullAll();
  store.emit('change', { store: '*' });
  return applied;
}

// --- Destructive maintenance --------------------------------------------

async function deleteCollection(path) {
  const root = db.collection('users').doc(user.uid);
  let removed = 0;
  // Pages of 300 keep each batch well inside Firestore's limit.
  for (;;) {
    const snap = await root.collection(path).limit(300).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += snap.size;
    if (snap.size < 300) break;
  }
  return removed;
}

const RESET_DOC = 'cloudReset';

/**
 * First time this account connects, clear the database out and upload this
 * device as the new contents.
 *
 * The marker is written to the cloud as well as locally, so installing the app
 * on a second phone pulls the existing data down instead of wiping it.
 */
export async function resetCloudOnce() {
  if (!user || !db) return null;
  if (store.get('meta', RESET_DOC)) return null;

  const root = db.collection('users').doc(user.uid);
  const remoteMarker = await root.collection(remote('meta')).doc(RESET_DOC).get();
  if (remoteMarker.exists) {
    // Another device already did this. Record it locally and leave the data alone.
    await store.applyRemote('meta', { id: RESET_DOC, ...remoteMarker.data() });
    return null;
  }

  publish({ status: 'syncing' });
  let removed = 0;
  for (const name of LEGACY_COLLECTIONS) removed += await deleteCollection(name);
  for (const name of store.STORE_NAMES) removed += await deleteCollection(remote(name));

  await store.put('meta', {
    id: RESET_DOC,
    resetAt: Date.now(),
    removed,
    note: 'Database cleared when this version first connected.',
  }, { silent: true });
  await store.put('meta', { id: 'syncCursor', lastPullAt: Date.now() }, { silent: true });
  await store.clearDirty('meta', ['syncCursor']);

  const uploaded = await store.markAllDirty();
  await pushAll();
  publish({ status: 'ready', lastSync: Date.now() });
  return { removed, uploaded };
}

export const cloudResetInfo = () => store.get('meta', RESET_DOC) || null;

/** Count of documents left over from the previous version of this app. */
export async function legacyCount() {
  if (!user || !db) return 0;
  const root = db.collection('users').doc(user.uid);
  let total = 0;
  for (const name of LEGACY_COLLECTIONS) {
    const snap = await root.collection(name).limit(1000).get();
    total += snap.size;
  }
  return total;
}

/** Delete every document the previous version of this app wrote. */
export async function wipeLegacy() {
  if (!user || !db) throw new Error('Not signed in');
  let removed = 0;
  for (const name of LEGACY_COLLECTIONS) removed += await deleteCollection(name);
  return removed;
}

/** Delete this app's cloud copy. Local data is untouched. */
export async function wipeRemote() {
  if (!user || !db) throw new Error('Not signed in');
  let removed = 0;
  for (const name of store.STORE_NAMES) removed += await deleteCollection(remote(name));
  return removed;
}
