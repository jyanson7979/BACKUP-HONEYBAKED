// sw.js - Service Worker para sa Honeybaked PWA

// I-usab ang number matag update sa website aron mo-refresh ang cache sa tanan
const CACHE_NAME = 'honeybaked-v3';

// Ang mga files nga i-cache para mogana ang app bisag offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/apple-touch-icon.png'
];

// INSTALL - i-save ang mga files sa cache
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(error => console.log('Cache failed:', error))
  );
});

// FETCH
// - HTML pages: NETWORK FIRST (kanunay latest nga version; cache ra kung offline)
// - Images/CSS/JS ug uban pa: CACHE FIRST (paspas), unya i-update sa background
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ayaw i-intercept ang laing websites (Google Maps, Facebook, etc.)
  if (url.origin !== self.location.origin) return;

  const isPage =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    // NETWORK FIRST
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // CACHE FIRST (stale-while-revalidate para sa assets)
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ACTIVATE - tangtangon ang daan nga caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});
