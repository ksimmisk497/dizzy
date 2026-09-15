"use strict";
(function () {
  var KEY = "dizzy_ua_v1";
  var profiles = {
    chrome: {
      label: "Chrome (Desktop)",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    },
    chrome_mac: {
      label: "Chrome (Mac)",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    },
    chrome_mobile: {
      label: "Chrome (Mobile)",
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
    },
    tiktok: {
      label: "TikTok mode (Mobile Chrome)",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1"
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
    try { pushToSW(); } catch (e2) {}
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

  // Spoof navigator.userAgent in this page context
  function applyLocalSpoof() {
    try {
      var ua = current().ua;
      var nav = window.navigator;
      try {
        Object.defineProperty(nav, "userAgent", { get: function () { return ua; }, configurable: true });
      } catch (e1) {}
      try {
        Object.defineProperty(nav, "appVersion", { get: function () { return ua; }, configurable: true });
      } catch (e2) {}
      try {
        Object.defineProperty(nav, "platform", {
          get: function () {
            if (/Android/i.test(ua)) return "Linux armv8l";
            if (/iPhone|iPad/i.test(ua)) return "iPhone";
            if (/Mac/i.test(ua)) return "MacIntel";
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
      // maxTouchPoints helps sites detect mobile
      try {
        if (/Mobile|Android|iPhone/i.test(ua)) {
          Object.defineProperty(nav, "maxTouchPoints", { get: function () { return 5; }, configurable: true });
        }
      } catch (e5) {}
    } catch (e) {}
  }

  applyLocalSpoof();

    function pushToSW() {
    try {
      var ua = current().ua;
      if (!navigator.serviceWorker) return;
      var msg = { type: "DIZZY_UA", ua: ua };
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(msg);
      }
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.active) reg.active.postMessage(msg);
      }).catch(function () {});
    } catch (e) {}
  }
  pushToSW();
  setInterval(pushToSW, 5000);

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
