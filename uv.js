// Dizzy UV Service Worker — multi-bare failover + fast activate
"use strict";

var _bareIndex = 0;
var _UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function getBase() {
  var p = self.location.pathname.replace(/\/[^\/]*$/, "");
  return p;
}
var base = getBase();
function u(p) { return base + p; }

importScripts(u("/uv/uv.bundle.js"));
importScripts(u("/uv/uv.config.js"));
importScripts(u("/uv/uv.sw.js"));

var sw = new UVServiceWorker();

// ── Bare server health probe — pick the fastest responding one ──────────────
var _bareList = null;
var _barePicked = false;

async function pickBestBare() {
  if (_barePicked) return;
  _barePicked = true;
  var list = (self.__uv$config && self.__uv$config.bareServers) || [
    "https://wes-prox.ksimmisk497.workers.dev/",
    "https://uv.holyubofficial.net/",
    "https://bare.operand.org/",
    "https://bareserver.r58playz.dev/"
  ];
  _bareList = list;

  // Race them — first bare to respond to a HEAD wins
  try {
    var winner = await Promise.any(
      list.map(function (url) {
        return fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(2500) })
          .then(function (r) { return r.ok || r.status < 500 ? url : Promise.reject(); });
      })
    );
    if (winner && self.__uv$config) {
      self.__uv$config.bare = winner;
    }
  } catch (e) {
    // All failed — stick with primary, UV will surface error to user
  }
}

// ── UA persistence ───────────────────────────────────────────────────────────
async function loadUA() {
  try {
    var c = await caches.open("dizzy-meta");
    var r = await c.match("/__ua__");
    if (r) { var t = await r.text(); if (t) _UA = t; }
  } catch (e) {}
}
async function storeUA(ua) {
  _UA = ua;
  try {
    var c = await caches.open("dizzy-meta");
    await c.put("/__ua__", new Response(ua, { headers: { "content-type": "text/plain" } }));
  } catch (e) {}
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      loadUA(),
      pickBestBare(),           // probe bare servers immediately on activate
      // Nuke old caches — stale SW is the #1 reason proxy breaks after updates
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== "dizzy-meta"; })
              .map(function (k) { return caches.delete(k); })
        );
      })
    ])
  );
});

// ── Messages ─────────────────────────────────────────────────────────────────
self.addEventListener("message", function (e) {
  try {
    if (e.data && e.data.type === "DIZZY_UA" && e.data.ua) storeUA(e.data.ua);
    if (e.data && e.data.type === "DIZZY_BARE") {
      if (e.data.bare && self.__uv$config) self.__uv$config.bare = e.data.bare;
      if (e.data.bareServers && self.__uv$config) self.__uv$config.bareServers = e.data.bareServers;
      _barePicked = false;
      _bareList = e.data.bareServers || _bareList;
    }
  } catch (err) {}
});

// ── Fetch intercept with UA injection ────────────────────────────────────────
var _origFetch = self.fetch.bind(self);
self.fetch = function (input, init) {
  try {
    var ua = _UA;
    if (ua) {
      if (typeof Request !== "undefined" && input instanceof Request) {
        var h = new Headers(input.headers || {});
        try {
          var bh = h.get("x-bare-headers");
          if (bh) {
            var obj = JSON.parse(bh);
            obj["user-agent"] = ua;
            obj["User-Agent"] = ua;
            h.set("x-bare-headers", JSON.stringify(obj));
          }
        } catch (e2) {}
        input = new Request(input, { headers: h });
      } else if (typeof input === "string") {
        init = init || {};
        var h2 = new Headers(init.headers || {});
        try {
          var bh2 = h2.get("x-bare-headers");
          if (bh2) {
            var obj2 = JSON.parse(bh2);
            obj2["user-agent"] = ua;
            obj2["User-Agent"] = ua;
            h2.set("x-bare-headers", JSON.stringify(obj2));
          }
        } catch (e3) {}
        init.headers = h2;
      }
    }
  } catch (err) {}
  return _origFetch(input, init);
};

// ── Route proxy requests through UV ─────────────────────────────────────────
self.addEventListener("fetch", function (e) {
  var prefix = (self.__uv$config && self.__uv$config.prefix) || "/service/";
  if (e.request.url.indexOf(prefix) === -1) return;

  e.respondWith((async function () {
    // Ensure bare is picked before first real proxied request
    if (!_barePicked) await pickBestBare();
    return sw.fetch(e);
  })());
});
