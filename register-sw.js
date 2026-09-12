"use strict";
async function registerSW() {
  if (location.protocol === "file:" || location.origin === "null") {
    throw new Error(
      "Open the GitHub Pages site (https://YOURUSER.github.io/REPO/), not the local file."
    );
  }
  if (!navigator.serviceWorker) {
    throw new Error("Service workers require HTTPS (GitHub Pages).");
  }
  if (typeof __uv$config === "undefined") return;

  var scope = __uv$config.prefix;
  var swUrl = new URL("uv.js", location.href).href;

  var regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(function (r) { return r.unregister(); }));

  if (window.caches) {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (_) {}
  }

  var reg = await navigator.serviceWorker.register(swUrl, {
    scope: scope,
    updateViaCache: "none"
  });
  try { await reg.update(); } catch (_) {}

  await new Promise(function (resolve) {
    if (reg.active && !reg.installing && !reg.waiting) {
      resolve();
      return;
    }
    var sw = reg.installing || reg.waiting;
    if (!sw) {
      resolve();
      return;
    }
    sw.addEventListener("statechange", function h() {
      if (sw.state === "activated" || sw.state === "redundant") {
        sw.removeEventListener("statechange", h);
        resolve();
      }
    });
    setTimeout(resolve, 5000);
  });
}
