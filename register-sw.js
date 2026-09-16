"use strict";
var __dizzySWReady = null;

async function registerSW() {
  if (location.protocol === "file:" || location.origin === "null") {
    throw new Error("Open via HTTPS, not a local file.");
  }
  if (!navigator.serviceWorker || typeof __uv$config === "undefined") return;
  if (__dizzySWReady) return __dizzySWReady;

  __dizzySWReady = (async function () {
    var scope = __uv$config.prefix;
    // Cache-bust the SW URL so stale workers never block proxy startup
    var swUrl = new URL("uv.js", location.href).href + "?v=" + (Date.now() >> 10);
    var reg;

    try {
      reg = await navigator.serviceWorker.register(swUrl, {
        scope: scope,
        updateViaCache: "none"
      });
    } catch (err) {
      // Scope conflict: unregister all workers on this origin and retry once
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function (r) { return r.unregister(); }));
      reg = await navigator.serviceWorker.register(swUrl, {
        scope: scope,
        updateViaCache: "none"
      });
    }

    // Force the new SW active immediately — don't wait for old tabs to close
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    if (!reg.active) {
      await Promise.race([
        new Promise(function (resolve) {
          var sw = reg.installing || reg.waiting;
          if (!sw) return resolve();
          sw.addEventListener("statechange", function () {
            if (sw.state === "activated" || sw.state === "redundant") resolve();
          });
        }),
        new Promise(function (r) { setTimeout(r, 600); })
      ]);
    }

    // Background update check — never blocks first load
    reg.update().catch(function () {});
  })();

  try {
    await __dizzySWReady;
  } catch (e) {
    __dizzySWReady = null;
    throw e;
  }
}
