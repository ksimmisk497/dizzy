"use strict";
(function () {
  var KEY = "dizzy_proxy_v1";

  // Popular public Bare endpoints used with Ultraviolet-style frontends.
  // Full proxy apps (Interstellar, Scramjet UI, etc.) need Node hosts — not possible on GitHub Pages alone.
  var presets = {
    dizzy: {
      id: "dizzy",
      label: "Dizzy (default)",
      bare: "https://wes-prox.ksimmisk497.workers.dev/",
      bareServers: [
        "https://wes-prox.ksimmisk497.workers.dev/",
        "https://uv.holyubofficial.net/",
        "https://bare.operand.org/",
        "https://bareserver.r58playz.dev/"
      ]
    },
    holy: {
      id: "holy",
      label: "Holy Unblocker bare",
      bare: "https://uv.holyubofficial.net/",
      bareServers: [
        "https://uv.holyubofficial.net/",
        "https://wes-prox.ksimmisk497.workers.dev/",
        "https://bare.operand.org/"
      ]
    },
    operand: {
      id: "operand",
      label: "Operand bare",
      bare: "https://bare.operand.org/",
      bareServers: [
        "https://bare.operand.org/",
        "https://wes-prox.ksimmisk497.workers.dev/",
        "https://uv.holyubofficial.net/"
      ]
    },
    r58: {
      id: "r58",
      label: "R58 bare",
      bare: "https://bareserver.r58playz.dev/",
      bareServers: [
        "https://bareserver.r58playz.dev/",
        "https://wes-prox.ksimmisk497.workers.dev/",
        "https://bare.operand.org/"
      ]
    },
    tomp: {
      id: "tomp",
      label: "TompHTTP public",
      bare: "https://tomp.app/",
      bareServers: [
        "https://tomp.app/",
        "https://wes-prox.ksimmisk497.workers.dev/",
        "https://uv.holyubofficial.net/"
      ]
    }
  };

  function load() {
    try {
      var id = localStorage.getItem(KEY) || "dizzy";
      if (!presets[id]) id = "dizzy";
      return id;
    } catch (e) {
      return "dizzy";
    }
  }

  function current() {
    return presets[load()] || presets.dizzy;
  }

  function applyConfig(p) {
    try {
      if (typeof self !== "undefined" && self.__uv$config) {
        self.__uv$config.bare = p.bare;
        self.__uv$config.bareServers = p.bareServers.slice();
      }
      if (typeof window !== "undefined" && window.__uv$config) {
        window.__uv$config.bare = p.bare;
        window.__uv$config.bareServers = p.bareServers.slice();
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "DIZZY_BARE",
          bare: p.bare,
          bareServers: p.bareServers
        });
      }
      if (navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg.active) {
            reg.active.postMessage({
              type: "DIZZY_BARE",
              bare: p.bare,
              bareServers: p.bareServers
            });
          }
        }).catch(function () {});
      }
    } catch (e2) {}
  }

  function save(id) {
    if (!presets[id]) id = "dizzy";
    try { localStorage.setItem(KEY, id); } catch (e) {}
    var p = presets[id];
    applyConfig(p);
    return id;
  }

  function list() {
    return Object.keys(presets).map(function (id) {
      return { id: id, label: presets[id].label };
    });
  }

  // Apply on load
  try { applyConfig(current()); } catch (e) {}

  window.DizzyProxy = {
    presets: presets,
    load: load,
    save: save,
    current: current,
    list: list,
    applyConfig: applyConfig
  };
})();
