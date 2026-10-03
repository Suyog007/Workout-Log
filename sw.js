/* Workout Log service worker
 *
 * Strategy
 *  - navigations: network-first with a short timeout, falling back to the
 *    cached shell, so a new deploy is picked up immediately when online and the
 *    app still opens on the gym floor with no signal.
 *  - same-origin assets: stale-while-revalidate — instant from cache, refreshed
 *    in the background. A deploy is live on the next launch without having to
 *    remember to bump anything here.
 *  - Firebase SDK (cross-origin): cache-first with a background refresh.
 *
 * Bumping BUILD purges every older cache on activate.
 */

const BUILD = '2026-10-03.1';
const CACHE = `workout-log-${BUILD}`;
const NAV_TIMEOUT_MS = 3000;

const SHELL = [
  // '/' is deliberately absent: it is the same document as /index.html, which
  // navigationStrategy already falls back to, and caching a redirect throws.
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/app-theme.js',
  '/js/config/program.js',
  '/js/config/firebase.js',
  '/js/core/store.js',
  '/js/core/model.js',
  '/js/core/router.js',
  '/js/core/util.js',
  '/js/core/sync.js',
  '/js/logic/progression.js',
  '/js/logic/prs.js',
  '/js/logic/analytics.js',
  '/js/ui/components.js',
  '/js/ui/charts.js',
  '/js/ui/timer.js',
  '/js/ui/entry.js',
  '/js/views/home.js',
  '/js/views/workout.js',
  '/js/views/finish.js',
  '/js/views/progress.js',
  '/js/views/history.js',
  '/js/views/session-detail.js',
  '/js/views/compare.js',
  '/js/views/metrics.js',
  '/js/views/profile.js',
  '/js/views/library.js',
  '/js/views/week.js',
  '/js/views/block.js',
  '/js/views/welcome.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // `reload` bypasses the HTTP cache so a fresh install never bakes in a
    // stale copy of a file.
    await Promise.all(SHELL.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url, res);
      } catch {
        /* a missing optional asset must not fail the whole install */
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache Firebase traffic — it has its own transport and auth.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('firebaseio.com')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.hostname === 'www.gstatic.com') {
    event.respondWith(cacheFirst(request));
  }
});

async function navigationStrategy(request) {
  const cache = await caches.open(CACHE);
  try {
    const network = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (network && network.ok) {
      cache.put('/index.html', network.clone());
      return network;
    }
  } catch {
    /* offline or slow — fall through to the cached shell */
  }
  return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error();
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((res) => { if (res && res.ok) cache.put(request, res.clone()); }).catch(() => {});
    return cached;
  }
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
