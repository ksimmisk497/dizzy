"use strict";
(function () {
  var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  function applyLocalSpoof() {
    try {
      var nav = window.navigator;
      try { Object.defineProperty(nav, "userAgent", { get: function () { return UA; }, configurable: true }); } catch (e1) {}
      try { Object.defineProperty(nav, "appVersion", { get: function () { return UA; }, configurable: true }); } catch (e2) {}
      try { Object.defineProperty(nav, "platform", { get: function () { return "Win32"; }, configurable: true }); } catch (e3) {}
      try { Object.defineProperty(nav, "vendor", { get: function () { return "Google Inc."; }, configurable: true }); } catch (e4) {}
      try { Object.defineProperty(nav, "language", { get: function () { return "en-US"; }, configurable: true }); } catch (e5) {}
      try { Object.defineProperty(nav, "languages", { get: function () { return ["en-US", "en"]; }, configurable: true }); } catch (e6) {}
    } catch (e) {}
  }

  function pushToSW() {
    try {
      var msg = { type: "DIZZY_UA", ua: UA };
      if (!navigator.serviceWorker) return;
      if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg);
      navigator.serviceWorker.ready.then(function (reg) {
        try {
          if (reg.active) reg.active.postMessage(msg);
          if (reg.waiting) reg.waiting.postMessage(msg);
          if (reg.installing) reg.installing.postMessage(msg);
        } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  }

  applyLocalSpoof();
  pushToSW();
  setInterval(pushToSW, 3000);
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("controllerchange", pushToSW);
  }

  window.DizzyUA = {
    getUA: function () { return UA; },
    current: function () { return { id: "chrome", label: "Chrome", ua: UA }; },
    load: function () { return "chrome"; },
    save: function () { return "chrome"; },
    list: function () { return [{ id: "chrome", label: "Chrome" }]; },
    applyLocalSpoof: applyLocalSpoof,
    pushToSW: pushToSW
  };
})();
