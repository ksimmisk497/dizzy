"use strict";
(function (global) {
  var FALLBACK_IMG = "favicon.png";
  var catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch("vendor/games-catalog.json", { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) throw new Error("Games catalog could not be loaded");
          return response.json();
        })
        .then(function (rows) {
          if (!Array.isArray(rows)) return [];
          return rows.filter(function (game) {
            return game && game.name && game.url;
          });
        })
        .catch(function (error) {
          catalogPromise = null;
          throw error;
        });
    }
    return catalogPromise;
  }

  function openGame(url, title) {
    if (!url) return;
    try {
      var local = new URL(String(url).trim(), location.href);
      if (local.origin === location.origin && /\/vendor\/games\//i.test(local.pathname)) {
        if (global.BrowserTabs && typeof global.BrowserTabs.openTab === "function") {
          global.BrowserTabs.openTab(local.href, title || "Game");
        } else {
          global.open(local.href, "_blank");
        }
        return;
      }
    } catch (error) {}
    if (global.BrowserTabs && typeof global.BrowserTabs.openTab === "function") {
      global.BrowserTabs.openTab(String(url), title || "Game");
    } else {
      global.open(String(url), "_blank");
    }
  }

  global.DizzyGames = {
    loadStash: loadCatalog,
    openGame: openGame,
    FALLBACK_IMG: FALLBACK_IMG
  };
})(window);
