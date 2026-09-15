var base = self.location.pathname.replace(/\/[^\/]*$/, "");
function u(p) { return base + p; }
importScripts(u("/uv/uv.bundle.js"));
importScripts(u("/uv/uv.config.js"));
importScripts(u("/uv/uv.sw.js"));

var sw = new UVServiceWorker();
self.__dizzyUA = null;

async function loadStoredUA() {
  try {
    var cache = await caches.open("dizzy-meta");
    var res = await cache.match("/__ua__");
    if (res) {
      var t = await res.text();
      if (t) self.__dizzyUA = t;
    }
  } catch (e) {}
}
async function storeUA(ua) {
  self.__dizzyUA = ua;
  try {
    var cache = await caches.open("dizzy-meta");
    await cache.put("/__ua__", new Response(ua, { headers: { "content-type": "text/plain" } }));
  } catch (e) {}
}
loadStoredUA();

self.addEventListener("message", function (e) {
  try {
    if (e.data && e.data.type === "DIZZY_UA" && e.data.ua) {
      storeUA(String(e.data.ua));
    }
  } catch (err) {}
});

var _fetch = self.fetch.bind(self);
self.fetch = function (input, init) {
  try {
    var ua = self.__dizzyUA;
    if (ua) {
      if (typeof Request !== "undefined" && input instanceof Request) {
        var h = new Headers(input.headers || {});
        h.set("x-dizzy-ua", ua);
        // Force UA inside x-bare-headers if present
        try {
          var bareH = h.get("x-bare-headers");
          if (bareH) {
            var obj = JSON.parse(bareH);
            obj["user-agent"] = ua;
            obj["User-Agent"] = ua;
            h.set("x-bare-headers", JSON.stringify(obj));
          }
        } catch (e2) {}
        input = new Request(input, { headers: h });
      } else if (typeof input === "string") {
        init = init || {};
        var h2 = new Headers(init.headers || {});
        h2.set("x-dizzy-ua", ua);
        try {
          var bareH2 = h2.get("x-bare-headers");
          if (bareH2) {
            var obj2 = JSON.parse(bareH2);
            obj2["user-agent"] = ua;
            obj2["User-Agent"] = ua;
            h2.set("x-bare-headers", JSON.stringify(obj2));
          }
        } catch (e3) {}
        init.headers = h2;
        return _fetch(input, init);
      }
    }
  } catch (err) {}
  return _fetch(input, init);
};

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(Promise.all([self.clients.claim(), loadStoredUA()]));
});
self.addEventListener("fetch", function (e) {
  var prefix = (self.__uv$config && self.__uv$config.prefix) || "/service/";
  if (e.request.url.indexOf(prefix) !== -1) {
    e.respondWith((async function () {
      if (!self.__dizzyUA) await loadStoredUA();
      return sw.fetch(e);
    })());
  }
});
