var base = self.location.pathname.replace(/\/[^\/]*$/, "");
function u(p) { return base + p; }
importScripts(u("/uv/uv.bundle.js"));
importScripts(u("/uv/uv.config.js"));
importScripts(u("/uv/uv.sw.js"));

var sw = new UVServiceWorker();
self.__dizzyUA = null;

self.addEventListener("message", function (e) {
  try {
    if (e.data && e.data.type === "DIZZY_UA" && e.data.ua) {
      self.__dizzyUA = String(e.data.ua);
    }
  } catch (err) {}
});

// Inject selected UA into Bare requests
var _fetch = self.fetch.bind(self);
self.fetch = function (input, init) {
  try {
    if (self.__dizzyUA) {
      if (typeof input === "string") {
        init = init || {};
        var h = new Headers(init.headers || {});
        h.set("x-dizzy-ua", self.__dizzyUA);
        if (!h.has("user-agent")) h.set("user-agent", self.__dizzyUA);
        init.headers = h;
        return _fetch(input, init);
      }
      if (input && typeof Request !== "undefined" && input instanceof Request) {
        var url = input.url || "";
        if (/workers\.dev|\/bare|x-bare|spring-lab/i.test(url) || true) {
          var h2 = new Headers(input.headers || {});
          h2.set("x-dizzy-ua", self.__dizzyUA);
          // Request.user-agent may be forbidden; x-dizzy-ua is what worker reads
          input = new Request(input, { headers: h2 });
        }
      }
    }
  } catch (err) {}
  return _fetch(input, init);
};

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) {
  var prefix = (self.__uv$config && self.__uv$config.prefix) || "/service/";
  if (e.request.url.indexOf(prefix) !== -1) {
    e.respondWith(sw.fetch(e));
  }
});
