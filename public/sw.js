// Service Worker for "It's me, Kiki." PWA
const CACHE_NAME = 'kiki-cache-v1';
const ICON_URLS = [
  '/icons/kiki-32.png',
  '/icons/kiki-64.png',
  '/icons/kiki-96.png',
  '/icons/kiki-128.png',
  '/icons/kiki-192.png',
  '/icons/kiki-256.png',
  '/icons/kiki-512.png',
  '/icons/kiki-1024.png'
];

// Install event - cache only icon files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ICON_URLS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network first strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only cache icon files, use network-first for everything else
  const isIcon = ICON_URLS.some(iconUrl => url.pathname.endsWith(iconUrl));
  
  if (isIcon) {
    // For icons, try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        })
        .catch(() => {
          // If network fails, try the cache
          return caches.match(event.request);
        })
    );
  } else {
    // For all other requests, always go to network and don't cache
    event.respondWith(fetch(event.request));
  }
});
