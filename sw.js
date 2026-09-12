// This file intentionally left minimal.
// The proxy service worker is uv.js — registered via register-sw.js at scope /ultra-prox/service/
// This SW handles only static asset caching for the shell UI.

var cacheName = 'wes-proxy-v2';
var filesToCache = [
  '/ultra-prox/',
  '/ultra-prox/index.html',
  '/ultra-prox/index.css',
  '/ultra-prox/favicon.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== cacheName; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function(e) {
  // CRITICAL: never intercept requests under /ultra-prox/service/ — that's UV's scope
  if (e.request.url.includes('/ultra-prox/service/')) return;
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
