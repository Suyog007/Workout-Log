const CACHE_NAME = 'gymlog-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/firebase-config.js',
  '/js/db.js',
  '/js/import-history.js',
  '/js/app.js',
  '/manifest.json',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Let Firebase SDK requests go to network first (for auth/firestore)
  if (e.request.url.includes('firebaseio.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('firestore.googleapis.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for app assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
