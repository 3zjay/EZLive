// EZ Web Broadcast Studio Service Worker
const CACHE_NAME = 'ezlive-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch for streaming media and dynamic APIs
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
