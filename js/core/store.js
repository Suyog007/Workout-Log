// === Local-first data store ===
// IndexedDB is the source of truth. Everything is also held in memory so that
// reads are synchronous and screens render instantly — the dataset for one
// person over a few training blocks is tiny.
//
// Every document carries { id, updatedAt, dirty, deleted } so an optional cloud
// sync can push/pull by timestamp without the rest of the app knowing about it.

import { uid } from './util.js';

export const DB_NAME = 'workoutlog';
export const DB_VERSION = 1;

/** Collections that sync. Order matters only for display. */
export const STORES = {
  meta: { indexes: [] },
  programs: { indexes: ['status'] },
  exercises: { indexes: [] },
  sessions: { indexes: ['date', 'programId', 'status'] },
  exerciseSessions: { indexes: ['sessionId'] },
  setLogs: { indexes: ['sessionId', 'exerciseId'] },
  bodyWeight: { indexes: ['date'] },
  waist: { indexes: ['date'] },
  steps: { indexes: ['date'] },
  cardio: { indexes: ['date', 'sessionId'] },
  prs: { indexes: ['exerciseId', 'date'] },
  readiness: { indexes: ['date'] },
};

export const STORE_NAMES = Object.keys(STORES);

/** `meta` holds singletons and is never pushed as user data wholesale. */
const LOCAL_ONLY_FIELDS = ['dirty'];

let db = null;
const cache = new Map(); // storeName -> Map(id -> doc)

// --- Event bus -----------------------------------------------------------
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, payload) {
  (listeners.get(event) || []).forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error(`[store] listener for "${event}" failed`, err);
    }
  });
}

// --- Open ----------------------------------------------------------------
export function open() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      for (const [name, def] of Object.entries(STORES)) {
        let os;
        if (!idb.objectStoreNames.contains(name)) {
          os = idb.createObjectStore(name, { keyPath: 'id' });
        } else {
          os = req.transaction.objectStore(name);
        }
        for (const idx of def.indexes) {
          if (!os.indexNames.contains(idx)) os.createIndex(idx, idx, { unique: false });
        }
        if (!os.indexNames.contains('dirty')) os.createIndex('dirty', 'dirty', { unique: false });
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeNames, mode) {
  const t = db.transaction(storeNames, mode);
  return t;
}

function reqPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Load every collection into memory. Called once at boot. */
export async function hydrate() {
  await open();
  const t = tx(STORE_NAMES, 'readonly');
  await Promise.all(
    STORE_NAMES.map(async (name) => {
      const rows = await reqPromise(t.objectStore(name).getAll());
      const m = new Map();
      rows.forEach((r) => m.set(r.id, r));
      cache.set(name, m);
    })
  );
}

function map(store) {
  if (!cache.has(store)) cache.set(store, new Map());
  return cache.get(store);
}

// --- Reads (synchronous, from memory) ------------------------------------

/** Live documents in a collection (tombstones filtered out). */
export function all(store) {
  return [...map(store).values()].filter((d) => !d.deleted);
}

export function get(store, id) {
  const d = map(store).get(id);
  return d && !d.deleted ? d : null;
}

export function where(store, predicate) {
  return all(store).filter(predicate);
}

export function count(store, predicate) {
  return predicate ? where(store, predicate).length : all(store).length;
}

/** Raw access including tombstones — sync needs this. */
export function allRaw(store) {
  return [...map(store).values()];
}

// --- Writes --------------------------------------------------------------

function stamp(doc) {
  return { ...doc, updatedAt: Date.now(), dirty: 1 };
}

/**
 * Insert or replace a document. `doc.id` is generated when absent.
 * Returns the stored document.
 */
export async function put(store, doc, opts = {}) {
  await open();
  const next = stamp({ ...doc, id: doc.id || uid() });
  map(store).set(next.id, next);
  const t = tx([store], 'readwrite');
  await reqPromise(t.objectStore(store).put(next));
  if (!opts.silent) emit('change', { store, id: next.id });
  return next;
}

/** Shallow-merge a patch into an existing document. */
export async function patch(store, id, changes, opts = {}) {
  const current = map(store).get(id);
  if (!current) throw new Error(`[store] ${store}/${id} not found`);
  return put(store, { ...current, ...changes }, opts);
}

export async function putMany(store, docs, opts = {}) {
  await open();
  const stamped = docs.map((d) => stamp({ ...d, id: d.id || uid() }));
  const t = tx([store], 'readwrite');
  const os = t.objectStore(store);
  stamped.forEach((d) => {
    map(store).set(d.id, d);
    os.put(d);
  });
  await txDone(t);
  if (!opts.silent) emit('change', { store });
  return stamped;
}

/** Soft delete: keeps a tombstone so the deletion can propagate to the cloud. */
export async function remove(store, id, opts = {}) {
  const current = map(store).get(id);
  if (!current) return;
  return put(store, { ...current, deleted: true }, opts);
}

function txDone(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

// --- Sync support --------------------------------------------------------

export function dirtyDocs(store) {
  return allRaw(store).filter((d) => d.dirty);
}

export function hasDirty() {
  return STORE_NAMES.some((s) => dirtyDocs(s).length > 0);
}

/** Strip local-only bookkeeping before a document leaves the device. */
export function forWire(doc) {
  const out = { ...doc };
  LOCAL_ONLY_FIELDS.forEach((f) => delete out[f]);
  return out;
}

export async function clearDirty(store, ids) {
  await open();
  const t = tx([store], 'readwrite');
  const os = t.objectStore(store);
  ids.forEach((id) => {
    const d = map(store).get(id);
    if (!d) return;
    const next = { ...d };
    delete next.dirty;
    map(store).set(id, next);
    os.put(next);
  });
  await txDone(t);
}

/** Apply a remote document, newest-write-wins on `updatedAt`. */
export async function applyRemote(store, doc) {
  await open();
  const local = map(store).get(doc.id);
  if (local && (local.updatedAt || 0) >= (doc.updatedAt || 0)) return false;
  const next = { ...doc };
  delete next.dirty;
  map(store).set(doc.id, next);
  const t = tx([store], 'readwrite');
  await reqPromise(t.objectStore(store).put(next));
  return true;
}

// --- Wholesale operations ------------------------------------------------

export async function exportAll() {
  const data = {};
  STORE_NAMES.forEach((s) => {
    data[s] = allRaw(s).map(forWire);
  });
  return { app: 'workout-log', schema: DB_VERSION, exportedAt: new Date().toISOString(), data };
}

export async function importAll(payload, { replace = false } = {}) {
  await open();
  if (!payload || !payload.data) throw new Error('Not a Workout Log backup file');
  if (replace) await wipeLocal({ silent: true });
  let imported = 0;
  for (const store of STORE_NAMES) {
    const rows = payload.data[store];
    if (!Array.isArray(rows) || !rows.length) continue;
    const t = tx([store], 'readwrite');
    const os = t.objectStore(store);
    rows.forEach((row) => {
      if (!row || !row.id) return;
      const doc = { ...row, dirty: 1 };
      map(store).set(doc.id, doc);
      os.put(doc);
      imported++;
    });
    await txDone(t);
  }
  emit('change', { store: '*' });
  return imported;
}

export async function wipeLocal({ silent = false } = {}) {
  await open();
  const t = tx(STORE_NAMES, 'readwrite');
  STORE_NAMES.forEach((s) => {
    t.objectStore(s).clear();
    cache.set(s, new Map());
  });
  await txDone(t);
  if (!silent) emit('change', { store: '*' });
}
