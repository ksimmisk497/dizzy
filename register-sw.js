"use strict";
var __dizzySWReady = null;

async function registerSW() {
  if (location.protocol === "file:" || location.origin === "null") {
    throw new Error("Open via GitHub Pages HTTPS, not a local file.");
  }
  if (!navigator.serviceWorker) {
    throw new Error("Service workers require HTTPS.");
  }
  if (typeof __uv$config === "undefined") return;

  // Reuse in-flight / completed registration
  if (__dizzySWReady) return __dizzySWReady;

  __dizzySWReady = (async function () {
    var scope = __uv$config.prefix;
    var swUrl = new URL("uv.js", location.href).href;

    var existing = await navigator.serviceWorker.getRegistration(scope);
    var reg = existing;
    if (!reg) {
      reg = await navigator.serviceWorker.register(swUrl, {
        scope: scope,
        updateViaCache: "none"
      });
    }

    // Wait until active (max 6s)
    await new Promise(function (resolve) {
      if (reg.active) { resolve(); return; }
      var sw = reg.installing || reg.waiting;
      if (!sw) { resolve(); return; }
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      sw.addEventListener("statechange", function () {
        if (sw.state === "activated" || sw.state === "redundant") finish();
      });
      setTimeout(finish, 6000);
    });

    // Ensure controller when possible (max 3s)
    if (!navigator.serviceWorker.controller) {
      await new Promise(function (resolve) {
        var t = setTimeout(resolve, 3000);
        navigator.serviceWorker.addEventListener("controllerchange", function once() {
          navigator.serviceWorker.removeEventListener("controllerchange", once);
          clearTimeout(t);
          resolve();
        });
      });
    }
  })();

  try {
    await __dizzySWReady;
  } catch (e) {
    __dizzySWReady = null;
    throw e;
  }
}
