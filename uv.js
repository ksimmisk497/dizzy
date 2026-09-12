importScripts("/ultra-prox/uv/uv.bundle.js");
importScripts("/ultra-prox/uv/uv.config.js");
importScripts("/ultra-prox/uv/uv.sw.js");
const sw = new UVServiceWorker();
self.addEventListener("install",  ()  => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  // Only handle requests within the proxy scope
  if (e.request.url.includes("/ultra-prox/service/")) {
    e.respondWith(sw.fetch(e));
  }
  // Let everything else pass through normally — no caching
});
