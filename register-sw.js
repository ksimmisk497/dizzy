"use strict";
var __dizzySWReady = null;

async function registerSW() {
  if (location.protocol === "file:" || location.origin === "null") {
    throw new Error("Open via GitHub Pages HTTPS, not a local file.");
  }
  if (!navigator.serviceWorker || typeof __uv$config === "undefined") return;
  if (__dizzySWReady) return __dizzySWReady;

  __dizzySWReady = (async function () {
    var scope = __uv$config.prefix;
    var swUrl = new URL("uv.js", location.href).href;
    var reg = await navigator.serviceWorker.getRegistration(scope);
    if (!reg) {
      reg = await navigator.serviceWorker.register(swUrl, {
        scope: scope,
        updateViaCache: "none"
      });
    }
    // Don't block long — activate in background
    if (!reg.active) {
      await Promise.race([
        new Promise(function (resolve) {
          var sw = reg.installing || reg.waiting;
          if (!sw) return resolve();
          sw.addEventListener("statechange", function () {
            if (sw.state === "activated" || sw.state === "redundant") resolve();
          });
        }),
        new Promise(function (r) { setTimeout(r, 400); })
      ]);
    }
  })();

  try {
    await __dizzySWReady;
  } catch (e) {
    __dizzySWReady = null;
  }
}
