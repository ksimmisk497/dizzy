var base = self.location.pathname.replace(/\/[^\/]*$/, "");
function u(p) { return base + p; }
importScripts(u("/uv/uv.bundle.js"));
importScripts(u("/uv/uv.config.js"));
importScripts(u("/uv/uv.sw.js"));
var sw = new UVServiceWorker();
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  var prefix = (self.__uv$config && self.__uv$config.prefix) || "/service/";
  if (e.request.url.indexOf(prefix) !== -1) {
    e.respondWith(sw.fetch(e));
  }
});
