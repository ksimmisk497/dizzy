var cacheName = "wp-static-v3";
var filesToCache = [];

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  // Never cache proxy / bare / service routes
  if (url.indexOf("/service/") !== -1) return;
  if (url.indexOf("workers.dev") !== -1) return;
  if (url.indexOf("duckduckgo") !== -1) return;
  if (url.indexOf("tiktok") !== -1) return;
  // network-only for navigations
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(function () { return caches.match(e.request); }));
    return;
  }
});
