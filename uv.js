// Derive base path from where this SW file is served
// Works whether deployed at / or /ultra-prox/
const _base = self.location.pathname.replace(/\/uv\.js$/, "");

importScripts(_base + "/uv/uv.bundle.js");
importScripts(_base + "/uv/uv.config.js");
importScripts(_base + "/uv/uv.sw.js");

const sw = new UVServiceWorker();
self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/service/")) {
    e.respondWith(sw.fetch(e));
  }
});
