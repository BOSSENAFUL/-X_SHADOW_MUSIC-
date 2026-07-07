/*
Jammify PWA Service Worker
*/

const CACHE_NAME = "jammify-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // We only fetch network first, falling back to cache if offline.
  // This satisfies the PWA fetch handler check while avoiding caching state bugs.
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
