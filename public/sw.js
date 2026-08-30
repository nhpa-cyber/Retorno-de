const CACHE_NAME = 'pau-brasil-guarabira-cache-v2.5.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './logistics_truck.jpg',
  './pau_brasil_logo.jpg'
];

// Install event: cache pre-defined core assets safely and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching Core App Shell v2.5.0');
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`Failed to precache ${url}:`, err)))
        );
      })
  );
});

// Activate event: clean up all outdated caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event with safe caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extensions, firebase APIs, firestore real-time sockets
  if (
    url.origin.includes('chrome-extension') ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('firebase') ||
    url.origin.includes('googleapis.com')
  ) {
    return;
  }

  const isNavigation = request.mode === 'navigate' || 
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  const isStaticAsset = 
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    // Stale-while-revalidate or Network-first for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            }).catch(() => {});
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  } else if (isNavigation) {
    // Network first, fallback to cached index.html only for navigation (HTML) requests
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[Service Worker] Navigation fallback to cached index.html for:', request.url);
          return caches.match('./index.html').then((idx) => {
            return idx || caches.match('/') || caches.match(request);
          });
        })
    );
  } else {
    // Default network-first for other assets
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});


