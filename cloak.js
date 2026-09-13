"use strict";
(function () {
  var KEY = "dizzy_cloak_v1";
  var defaults = {
    title: "Dizzy",
    favicon: "favicon.png",
    panicKey: "`",
    panicUrl: "https://classroom.google.com/"
  };

  function load() {
    try {
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch (e) {
      return Object.assign({}, defaults);
    }
  }

  function save(cfg) {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  }

  function applyCloak(cfg) {
    cfg = cfg || load();
    try {
      document.title = cfg.title || "Dizzy";
    } catch (e) {}
    var links = document.querySelectorAll('link[rel*="icon"]');
    if (!links.length) {
      var l = document.createElement("link");
      l.rel = "icon";
      document.head.appendChild(l);
      links = [l];
    }
    links.forEach(function (link) {
      try {
        link.href = cfg.favicon || "favicon.png";
      } catch (e) {}
    });
  }

  function panic() {
    var cfg = load();
    var url = cfg.panicUrl || defaults.panicUrl;
    try {
      window.location.replace(url);
    } catch (e) {
      window.location.href = url;
    }
  }

  // Apply early
  applyCloak();

  // Panic key
  document.addEventListener("keydown", function (e) {
    var cfg = load();
    var key = cfg.panicKey || "`";
    if (!key) return;
    if (e.key === key || e.key.toLowerCase() === String(key).toLowerCase()) {
      // ignore when typing in inputs
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      panic();
    }
  });

  window.DizzyCloak = {
    load: load,
    save: save,
    apply: applyCloak,
    panic: panic,
    defaults: defaults
  };
})();
