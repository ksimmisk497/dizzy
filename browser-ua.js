"use strict";
(function () {
  var KEY = "dizzy_ua_v1";
  var profiles = {
    chrome_mobile: {
      label: "Chrome",
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    },
    edge: {
      label: "Edge",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
    },
    firefox: {
      label: "Firefox",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0"
    },
    safari: {
      label: "Safari",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15"
    },
    ddg: {
      label: "DuckDuckGo",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }
  };

  function load() {
    try {
      var id = localStorage.getItem(KEY) || "chrome_mobile";
      if (!profiles[id]) id = "chrome_mobile";
      return id;
    } catch (e) {
      return "chrome_mobile";
    }
  }

  function save(id) {
    if (!profiles[id]) id = "chrome_mobile";
    try { localStorage.setItem(KEY, id); } catch (e) {}
    applyLocalSpoof();
    pushToSW();
    return id;
  }

  function current() {
    var id = load();
    return { id: id, label: profiles[id].label, ua: profiles[id].ua };
  }

  function list() {
    return Object.keys(profiles).map(function (id) {
      return { id: id, label: profiles[id].label };
    });
  }

  function applyLocalSpoof() {
    try {
      var ua = current().ua;
      var nav = window.navigator;
      try { Object.defineProperty(nav, "userAgent", { get: function () { return ua; }, configurable: true }); } catch (e1) {}
      try { Object.defineProperty(nav, "appVersion", { get: function () { return ua; }, configurable: true }); } catch (e2) {}
      try {
        Object.defineProperty(nav, "platform", {
          get: function () {
            if (/Android/i.test(ua)) return "Linux armv8l";
            if (/iPhone|iPad/i.test(ua)) return "iPhone";
            if (/Mac OS/i.test(ua)) return "MacIntel";
            return "Win32";
          },
          configurable: true
        });
      } catch (e3) {}
      try {
        Object.defineProperty(nav, "vendor", {
          get: function () { return /Firefox/i.test(ua) ? "" : "Google Inc."; },
          configurable: true
        });
      } catch (e4) {}
      try {
        if (/Mobile|Android|iPhone/i.test(ua)) {
          Object.defineProperty(nav, "maxTouchPoints", { get: function () { return 5; }, configurable: true });
        }
      } catch (e5) {}
    } catch (e) {}
  }

  function pushToSW() {
    try {
      var ua = current().ua;
      var msg = { type: "DIZZY_UA", ua: ua };
      if (!navigator.serviceWorker) return;
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(msg);
      }
      navigator.serviceWorker.ready.then(function (reg) {
        try {
          if (reg.active) reg.active.postMessage(msg);
          if (reg.waiting) reg.waiting.postMessage(msg);
          if (reg.installing) reg.installing.postMessage(msg);
        } catch (e) {}
      }).catch(function () {});
      // Also store so every page can read it before SW is ready
      try { sessionStorage.setItem("dizzy_ua_string", ua); } catch (e2) {}
    } catch (e) {}
  }

  applyLocalSpoof();
  pushToSW();
  // Keep SW updated (SW can restart and forget memory)
  setInterval(pushToSW, 2000);

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      pushToSW();
    });
  }

  window.DizzyUA = {
    profiles: profiles,
    load: load,
    save: save,
    current: current,
    list: list,
    applyLocalSpoof: applyLocalSpoof,
    pushToSW: pushToSW,
    getUA: function () { return current().ua; }
  };
})();
