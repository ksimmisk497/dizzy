/* DIZZY_OPEN_GUARD */
(function () {
  var _open = window.open;
  window.open = function (url, name, features) {
    // UGS games commonly launch an about:blank window and document.write the game into it.
    // Keep normal about:blank behavior, but turn game launches into a real Dizzy tab.
    if (!url || url === "about:blank" || String(url).indexOf("about:blank") === 0) {
      try {
        var aeGame = document.activeElement;
        var onGamesPage = /games\.html$/i.test(location.pathname || '');
        var isGameButton = aeGame && ((aeGame.closest && aeGame.closest('#sections-container')) ||
          (aeGame.tagName === 'INPUT' && aeGame.type === 'button' && onGamesPage));
        if (isGameButton && window.BrowserTabs && typeof BrowserTabs.openBlankGameTab === 'function') {
          var gameLabel = '';
          if (aeGame.tagName === 'INPUT') gameLabel = aeGame.value || '';
          else gameLabel = (aeGame.textContent || '').trim();
          if (gameLabel.indexOf('cl') === 0) gameLabel = gameLabel.slice(2);
          return BrowserTabs.openBlankGameTab(gameLabel || 'Game');
        }
      } catch (eGame) {}
      return _open.apply(window, arguments);
    }
    if (typeof url === "string") {
      var label = "";
      try {
        var ae = document.activeElement;
        if (ae) {
          if (ae.tagName === "INPUT" && ae.type === "button") label = ae.value || "";
          else if (ae.tagName === "BUTTON") label = (ae.textContent || "").trim();
        }
      } catch (e) {}
      if (label.indexOf("cl") === 0) label = label.slice(2);
      if (window.BrowserTabs && typeof BrowserTabs.openTab === "function") {
        BrowserTabs.openTab(url, label || undefined);
        return { focus: function () {}, close: function () {}, closed: false, location: { href: url } };
      }
    }
    return _open.apply(window, arguments);
  };
})();

// ── Shared browser tab engine — used by both index.html and games.html ──────
"use strict";

var BrowserTabs = (function() {
  var tabs       = [];
  var activeTab  = 'home';
  var homeLabel  = 'New Tab';

  var contentArea, tabBar, newTabBtn, addressInput, homeFrame, chromeEl, spacer;

  function init(cfg) {
    homeLabel   = cfg.homeLabel  || 'New Tab';
    contentArea = document.getElementById('tab-content-area');
    tabBar      = document.getElementById('tab-bar');
    newTabBtn   = document.getElementById('new-tab-btn');
    addressInput= document.getElementById('address-input');
    homeFrame   = document.getElementById('home-frame');
    chromeEl    = document.getElementById('browser-chrome');
    spacer      = document.getElementById('chrome-height-spacer');

    updateSpacer();
    window.addEventListener('resize', updateSpacer);
    updateNavBtns();
    // Warm up service worker once (don't block UI)
    if (typeof registerSW === 'function') {
      registerSW().catch(function(){});
    }

    // Hijack window.open so game.js and any other script can't spawn real browser tabs
    var _origOpen = window.open.bind(window);
    window.open = function(url, name, features) {
      if (!url || url === 'about:blank' || String(url).indexOf('about:blank') === 0) {
        try {
          var aeGame = document.activeElement;
          var onGamesPage = /games\.html$/i.test(location.pathname || '');
          var isGameButton = aeGame && ((aeGame.closest && aeGame.closest('#sections-container')) ||
            (aeGame.tagName === 'INPUT' && aeGame.type === 'button' && onGamesPage));
          if (isGameButton && typeof BrowserTabs.openBlankGameTab === 'function') {
            var gameLabel = aeGame.tagName === 'INPUT' ? (aeGame.value || '') : (aeGame.textContent || '').trim();
            if (gameLabel.indexOf('cl') === 0) gameLabel = gameLabel.slice(2);
            return BrowserTabs.openBlankGameTab(gameLabel || 'Game');
          }
        } catch (eGame) {}
        return _origOpen(url, name, features);
      }
      if (typeof url === 'string') {
        var label = '';
        try {
          var ae = document.activeElement;
          if (ae) {
            if (ae.tagName === 'INPUT' && ae.type === 'button') label = ae.value || '';
            else if (ae.tagName === 'BUTTON') label = (ae.textContent || '').trim();
          }
        } catch (e) {}
        if (label && label.indexOf('cl') === 0) label = label.slice(2);
        openTab(url, label || undefined);
        return { focus: function(){}, closed: false, location: { href: url }, close: function(){} };
      }
      return _origOpen(url, name, features);
    };

    // Auto-open queued tab from sessionStorage (set by games.html redirect)
    var queued = sessionStorage.getItem('dizzy_open_tab');
    if (queued) {
      sessionStorage.removeItem('dizzy_open_tab');
      var qTitle = sessionStorage.getItem('dizzy_open_title') || '';
      sessionStorage.removeItem('dizzy_open_title');
      waitForUV(function() { openTab(queued, qTitle || undefined); });
    }
  }

  function updateSpacer() {
    if (!chromeEl || !spacer || !contentArea) return;
    var h = chromeEl.offsetHeight;
    spacer.style.height = h + 'px';
    contentArea.style.top = h + 'px';
  }

  function genId() { return 'tab_' + Math.random().toString(36).slice(2,8); }

  // DIZZY GAME LOADER
  // Lightweight launch overlay: no artificial multi-second delay. The game
  // loads underneath it, while the UI simply shows a polished typing loader.
  function isGameUrl(u) {
    if (!u) return false;
    var s = String(u);
    return /UGS-Files/i.test(s) || /ugs-singlefile/i.test(s) || /UGS-Assets/i.test(s);
  }

  function createGameLoader(id, title) {
    var loader = document.createElement('div');
    loader.className = 'tab-game-loader active';
    loader.id = 'game-loader_' + id;
    loader.setAttribute('aria-live', 'polite');
    loader.innerHTML =
      '<div class="game-loader-orbit" aria-hidden="true"></div>' +
      '<div class="game-loader-glow" aria-hidden="true"></div>' +
      '<div class="game-loader-card">' +
        '<img class="game-loader-logo" src="obsidianlogo.png" alt="Dizzy">' +
        '<div class="game-loader-line" aria-hidden="true"></div>' +
        '<div class="game-loader-title"></div>' +
        '<div class="game-loader-status" aria-label="Loading"><span class="game-loader-typing">Loading</span><span class="game-loader-caret" aria-hidden="true"></span></div>' +
      '</div>';
    loader.querySelector('.game-loader-title').textContent = title || 'Game';
    loader.dataset.startedAt = String(Date.now());
    loader.dataset.finishRequested = '0';
    loader.dataset.failed = '0';
    contentArea.appendChild(loader);
    startGameLoaderTyping(loader);
    return loader;
  }

  function startGameLoaderTyping(loader) {
    if (!loader) return;
    if (loader._typingTimer) clearInterval(loader._typingTimer);
    var el = loader.querySelector('.game-loader-typing');
    if (!el) return;
    var step = 0;
    var states = ['Loading', 'Loading.', 'Loading..', 'Loading...'];
    el.textContent = states[0];
    loader._typingTimer = setInterval(function() {
      step = (step + 1) % states.length;
      el.textContent = states[step];
    }, 330);
  }

  // Keep the overlay for a tiny amount of time so extremely fast games don't
  // produce a one-frame flash, but never hold a game back for seconds.
  var GAME_LOADER_MIN_MS = 250;

  function reallyFinishGameLoader(id, failed) {
    var loader = document.getElementById('game-loader_' + id);
    if (!loader) return;
    if (loader._typingTimer) {
      clearInterval(loader._typingTimer);
      loader._typingTimer = null;
    }
    loader.classList.add('is-finishing');
    setTimeout(function() {
      loader.classList.remove('active');
      loader.classList.remove('is-finishing');
    }, failed ? 450 : 280);
  }

  function finishGameLoader(id, failed) {
    var loader = document.getElementById('game-loader_' + id);
    if (!loader) return;
    var elapsed = Date.now() - Number(loader.dataset.startedAt || Date.now());
    var remaining = Math.max(0, GAME_LOADER_MIN_MS - elapsed);
    loader.dataset.finishRequested = '1';
    loader.dataset.failed = failed ? '1' : '0';

    if (remaining > 0) {
      setTimeout(function() {
        var current = document.getElementById('game-loader_' + id);
        if (!current || current.dataset.finishRequested !== '1') return;
        reallyFinishGameLoader(id, current.dataset.failed === '1');
      }, remaining);
      return;
    }
    reallyFinishGameLoader(id, failed);
  }

  function waitForUV(cb) {
    if (typeof __uv$config !== 'undefined') { cb(); return; }
    var t = 0;
    var iv = setInterval(function() {
      t += 60;
      if (typeof __uv$config !== 'undefined') { clearInterval(iv); cb(); }
      else if (t > 5000) clearInterval(iv);
    }, 60);
  }

  function encodeURL(raw, cb) {
    function finish() {
      try {
        if (typeof __uv$config === 'undefined' || !__uv$config.encodeUrl) {
          // Fallback: open bing directly if UV missing
          var url = typeof searchWithDizzyEngine === 'function' ? searchWithDizzyEngine(raw) : raw;
          cb(url);
          return;
        }
        var url = typeof searchWithDizzyEngine === 'function' ? searchWithDizzyEngine(raw) : raw;
        cb(__uv$config.prefix + __uv$config.encodeUrl(url));
      } catch (e) {
        cb('https://duckduckgo.com/?q=' + encodeURIComponent(raw));
      }
    }
    waitForUV(function() {
      if (typeof registerSW === 'function') {
        var timedOut = false;
        var to = setTimeout(function() { timedOut = true; finish(); }, 1200);
        Promise.resolve()
          .then(function() { return registerSW(); })
          .catch(function() {})
          .then(function() {
            if (!timedOut) {
              clearTimeout(to);
              finish();
            }
          });
      } else {
        finish();
      }
    });
  }


  function isDizzySearchUrl(url) {
    try {
      var u = new URL(url, location.href);
      return /(^|\.)duckduckgo\.com$/i.test(u.hostname) && /[?&]q=/i.test(u.search || '');
    } catch (e) { return false; }
  }

  function decorateDizzySearch(frame, id, originalUrl) {
    return;
  }

  function isHomeUrl(url) {
    if (!url) return true;
    try {
      var u = new URL(url, location.href);
      var path = (u.pathname || '').split('/').pop() || '';
      return path === '' || path === 'index.html' || path === 'index.htm';
    } catch (e) {
      return /index\.html?$/i.test(String(url));
    }
  }

  function buildHomeSrcdoc() {
    var logo = 'obsidianlogo.png';
    try { logo = new URL('obsidianlogo.png', location.href).href; } catch (e) {}
    var tiktok = 'tiktok.png', discord = 'discord.png', roblox = 'roblox.png', spotify = 'spotify.png';
    try {
      tiktok = new URL('tiktok.png', location.href).href;
      discord = new URL('discord.png', location.href).href;
      roblox = new URL('roblox.png', location.href).href;
      spotify = new URL('spotify.png', location.href).href;
    } catch (e2) {}

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">' +
      '<style>' +
      '*{box-sizing:border-box}html,body{margin:0;padding:0;min-height:100%;background:transparent;color:#fff;' +
      'font-family:Open Sans,system-ui,sans-serif}' +
      'body{display:flex;flex-direction:column;align-items:center;padding:48px 20px 40px}' +
      '#logo{height:110px;width:auto;object-fit:contain;margin-bottom:22px;' +
      'filter:drop-shadow(0 0 28px rgba(120,100,220,.35))}' +
      '#search{padding:14px 22px;border:1px solid rgba(108,124,255,.35);border-radius:12px;font-size:15px;' +
      'width:min(400px,92vw);background:rgba(20,20,28,.85);color:#fff;text-align:center;outline:none;' +
      'font-family:inherit;box-shadow:0 0 0 1px rgba(108,124,255,.08),0 0 24px rgba(108,124,255,.12)}' +
      '#search::placeholder{color:#9a9aab}' +
      '#search:focus{border-color:rgba(140,150,255,.7);box-shadow:0 0 0 3px rgba(108,124,255,.18),0 0 36px rgba(108,124,255,.22)}' +
      '#quick{display:flex;justify-content:center;gap:36px;padding:28px 0 0;flex-wrap:wrap}' +
      '.q{display:flex;flex-direction:column;align-items:center;gap:10px;color:#b0b0c0;font-size:11px;font-weight:600;' +
      'letter-spacing:.6px;text-transform:uppercase;background:none;border:none;cursor:pointer;font-family:inherit}' +
      '.q:hover{color:#e8e8ff}' +
      '.c{width:62px;height:62px;border-radius:50%;background:rgba(20,20,28,.9);border:1px solid rgba(108,124,255,.22);' +
      'overflow:hidden;display:flex;align-items:center;justify-content:center;transition:box-shadow .2s,border-color .2s}' +
      '.q:hover .c{border-color:rgba(140,150,255,.75);box-shadow:0 0 0 3px rgba(108,124,255,.15),0 0 22px rgba(108,124,255,.35)}' +
      '.c img{width:60%;height:60%;object-fit:contain}' +
      '</style></head><body>' +
      '<img id="logo" src="' + logo + '" alt="Dizzy">' +
      '<input id="search" type="text" placeholder="Search or enter a URL" autocomplete="off">' +
      '<div id="quick">' +
      '<button class="q" data-url="https://tiktok.com"><div class="c"><img src="' + tiktok + '"></div>TikTok</button>' +
      '<button class="q" data-url="https://discord.com"><div class="c"><img src="' + discord + '"></div>Discord</button>' +
      '<button class="q" data-url="https://roblox.com"><div class="c"><img src="' + roblox + '"></div>Roblox</button>' +
      '<button class="q" data-url="https://spotify.com"><div class="c"><img src="' + spotify + '"></div>Spotify</button>' +
      '</div>' +
      '<script>' +
      'function go(u){try{parent.BrowserTabs.openTab(u)}catch(e){location.href=u}}' +
      'document.getElementById("search").addEventListener("keydown",function(e){' +
      'if(e.key==="Enter"){var v=this.value.trim();if(v)go(v)}});' +
      'document.querySelectorAll(".q").forEach(function(b){' +
      'b.addEventListener("click",function(){go(b.getAttribute("data-url"))})});' +
      '<\/script></body></html>';
  }

  function openTab(url, tabTitle, options) {
    options = options || {};
    var isNewHome = false;
    if (!url) {
      isNewHome = true;
      try {
        url = new URL('index.html?embed=1', location.href).href;
      } catch (e) {
        url = 'index.html?embed=1';
      }
      tabTitle = 'New Tab';
    }
    var id = genId();
    var initialTitle = (tabTitle && String(tabTitle).trim()) ? String(tabTitle).trim() : 'Loading…';
    var lockTitle = !!(tabTitle && String(tabTitle).trim()) || isNewHome;

    var tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.id = 'tabEl_' + id;
    tabEl.innerHTML =
      '<div class="tab-favicon-placeholder" id="fav_' + id + '"></div>' +
      '<span class="tab-title" id="title_' + id + '"></span>' +
      '<div class="tab-loading" id="spin_' + id + '"></div>' +
      '<button class="tab-close" title="Close">×</button>';
    tabEl.querySelector('.tab-title').textContent = initialTitle;
    tabEl.querySelector('.tab-close').onclick = function(e) {
      e.stopPropagation();
      closeTab(id);
    };
    tabEl.onclick = function() { switchTab(id); };
    tabBar.insertBefore(tabEl, newTabBtn);
    if (isNewHome) {
      setTabFavicon(id, (function() {
        try { return new URL('favicon.png', location.href).href; } catch (e) { return 'favicon.png'; }
      })());
      updateTabTitle(id, 'New Tab');
    }
    if (isDizzySearchUrl(url)) {
      setTabFavicon(id, (function() { try { return new URL('favicon.png', location.href).href; } catch (e) { return 'favicon.png'; } })());
    }

    var frame = document.createElement('iframe');
    frame.className = 'tab-frame';
    frame.id = 'frame_' + id;
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('allow', 'autoplay; fullscreen; gamepad; clipboard-write');
    contentArea.appendChild(frame);

    var gameLaunch = !!options.gameLaunch || isGameUrl(url);
    var gameLoader = gameLaunch ? createGameLoader(id, initialTitle) : null;

    tabs.push({
      id: id,
      url: url,
      title: initialTitle,
      frameEl: frame,
      tabEl: tabEl,
      lockedTitle: lockTitle,
      isHome: !!isNewHome,
      addressLabel: isNewHome ? 'New Tab' : null,
      gameLaunch: gameLaunch,
      gameLoader: gameLoader,
      dizzySearch: isDizzySearchUrl(url)
    });
    switchTab(id);
    tabEl.scrollIntoView({ behavior: 'smooth', inline: 'end' });

    // Only skip UV for real local pages / blob games — never for search queries
    function isLocalPage(u) {
      if (!u) return false;
      if (/^(blob:|data:|about:blank)/i.test(u)) return true;
      if (u.indexOf('UGS-Files') !== -1) return true;
      if (isNewHome) return true;
      try {
        var parsed = new URL(u, location.href);
        if (parsed.origin !== location.origin) return false;
        var leaf = (parsed.pathname || '').split('/').pop() || '';
        // only our actual files
        if (/^(index|games|404)\.html$/i.test(leaf)) return true;
        if (leaf === '' && /embed=1/i.test(parsed.search || '')) return true;
        return false;
      } catch (e) {
        return false;
      }
    }

    if (isLocalPage(url)) {
      frame.src = url;
      frame.addEventListener('load', function() {
        var spin = document.getElementById('spin_' + id);
        if (spin) spin.style.display = 'none';
        if (gameLaunch) finishGameLoader(id, false);
        if (isNewHome) {
          updateTabTitle(id, 'New Tab');
          setTabFavicon(id, (function() {
            try { return new URL('favicon.png', location.href).href; } catch (e) { return 'favicon.png'; }
          })());
          if (activeTab === id) updateAddressBar(id);
        } else if (lockTitle) {
          updateTabTitle(id, initialTitle);
        }
      });
      return { id: id, frameEl: frame, tabEl: tabEl, window: frame.contentWindow };
    }

    // Everything else goes through UV (search queries + external URLs)

    encodeURL(url, function(proxied) {
      frame.src = proxied;
      setTimeout(function() {
        var spin = document.getElementById('spin_' + id);
        if (spin) spin.style.display = 'none';
        if (gameLaunch) {
          var loader = document.getElementById('game-loader_' + id);
          if (loader && loader.classList.contains('active')) finishGameLoader(id, true);
        }
      }, gameLaunch ? 30000 : 8000);
      frame.addEventListener('load', function() {
        var spin = document.getElementById('spin_' + id);
        if (spin) spin.style.display = 'none';
        if (gameLaunch) finishGameLoader(id, false);
        var tab = null;
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].id === id) { tab = tabs[i]; break; }
        }
        if (tab && tab.dizzySearch) {
          decorateDizzySearch(frame, id, tab.url);
          setTabFavicon(id, (function() { try { return new URL('favicon.png', location.href).href; } catch (e) { return 'favicon.png'; } })());
          return;
        }
        if (tab && tab.lockedTitle) {
          updateTabTitle(id, tab.title);
          return;
        }
        try {
          var fdoc = frame.contentDocument || frame.contentWindow.document;
          var title = (fdoc && fdoc.title) ? fdoc.title : url;
          updateTabTitle(id, title);
          var favLink = fdoc.querySelector('link[rel*="icon"]');
          if (favLink) setTabFavicon(id, favLink.href);
        } catch (err) {
          try {
            var domain = new URL(url).hostname;
            updateTabTitle(id, domain);
            setTabFavicon(id, 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32');
          } catch (e2) {
            updateTabTitle(id, url);
          }
        }
      });
    });
    return { id: id, frameEl: frame, tabEl: tabEl, window: frame.contentWindow };
  }

  function openBlankGameTab(title) {
    var result = openTab('about:blank', title || 'Game', { gameLaunch: true, blankGame: true });
    if (!result || !result.window) return result;
    try {
      // Make the synthetic popup behave like the popup UGS expects.
      result.window.opener = window;
    } catch (_) {}
    return result.window;
  }

  function switchTab(id) {
    activeTab = id;
    homeFrame.classList.remove('active');
    document.querySelectorAll('.tab-frame').forEach(function(f) { f.classList.remove('active'); });
    document.querySelectorAll('.tab-game-loader').forEach(function(l) { l.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });

    if (id === 'home') {
      homeFrame.classList.add('active');
      var ht = document.getElementById('home-tab');
      if (ht) ht.classList.add('active');
      addressInput.value = homeLabel;
      addressInput.classList.add('home-tab');
      document.title = (window.DizzyCloak && DizzyCloak.load().title) || 'Dizzy';
    } else {
      var tab = tabs.find(function(t) { return t.id === id; });
      if (!tab) return;
      tab.frameEl.classList.add('active');
      tab.tabEl.classList.add('active');
      if (tab.gameLoader && tab.gameLoader.classList.contains('is-finishing') === false) {
        tab.gameLoader.classList.add('active');
      }
      updateAddressBar(id);
    }
    updateNavBtns();
  }

  function updateAddressBar(id) {
    var tab = tabs.find(function(t) { return t.id === id; });
    if (!tab) return;
    // Home / New Tab panels: show label, never file:// URLs
    if (tab.isHome || tab.addressLabel === 'New Tab' || (tab.title === 'New Tab' && tab.lockedTitle)) {
      addressInput.value = 'New Tab';
      addressInput.classList.add('home-tab');
      return;
    }
    try {
      var src = tab.frameEl.src || '';
      if (/^file:/i.test(src) || /embed=1/i.test(src) || /index\.html/i.test(src)) {
        addressInput.value = tab.title || 'New Tab';
        addressInput.classList.add('home-tab');
        return;
      }
      if (src && typeof __uv$config !== 'undefined' && src.includes(__uv$config.prefix)) {
        var encoded = src.replace(__uv$config.prefix, '');
        addressInput.value = __uv$config.decodeUrl(encoded);
      } else {
        addressInput.value = tab.url || '';
      }
    } catch(_) { addressInput.value = tab.url || ''; }
    addressInput.classList.remove('home-tab');
  }

  function closeTab(id) {
    var idx = tabs.findIndex(function(t) { return t.id === id; });
    if (idx === -1) return;
    var tab = tabs[idx];
    tab.tabEl.remove();
    tab.frameEl.remove();
    if (tab.gameLoader) tab.gameLoader.remove();
    tabs.splice(idx, 1);
    if (activeTab === id) {
      switchTab(tabs.length > 0 ? tabs[Math.max(0, idx-1)].id : 'home');
    }
  }

  function updateTabTitle(id, title) {
    var el = document.getElementById('title_' + id);
    if (el) el.textContent = title || 'Tab';
    var tab = tabs.find(function(t) { return t.id === id; });
    if (tab) tab.title = title;
    if (activeTab === id) document.title = (window.DizzyCloak && DizzyCloak.load().title) || 'Dizzy';
  }

  function setTabFavicon(id, src) {
    var ph = document.getElementById('fav_' + id);
    if (!ph) return;
    var img = document.createElement('img');
    img.className = 'tab-favicon';
    img.src = src;
    img.onerror = function() { img.remove(); };
    ph.replaceWith(img);
  }

  function addressGo() {
    var raw = addressInput.value.trim();
    if (!raw || raw === homeLabel || raw === 'New Tab') return;
    // Always open navigations through UV in a tab
    var tab = tabs.find(function(t) { return t.id === activeTab; });
    if (activeTab === 'home' || !tab || tab.isHome) {
      openTab(raw);
      return;
    }
    encodeURL(raw, function(proxied) {
      tab.frameEl.src = proxied;
      tab.url = raw;
      tab.isHome = false;
      tab.addressLabel = null;
      var spin = document.getElementById('spin_' + tab.id);
      if (spin) spin.style.display = '';
      updateTabTitle(tab.id, 'Loading…');
      updateAddressBar(tab.id);
    });
  }

  function addressFocus() {
    if (addressInput.classList.contains('home-tab')) {
      addressInput.value = '';
      addressInput.classList.remove('home-tab');
    }
    addressInput.select();
  }

  function addressBlur() {
    if (activeTab === 'home' || !addressInput.value.trim()) {
      addressInput.value = homeLabel;
      addressInput.classList.add('home-tab');
    }
  }

  function updateNavBtns() {
    var back    = document.getElementById('btn-back');
    var forward = document.getElementById('btn-forward');
    if (!back) return;
    back.disabled    = activeTab === 'home';
    forward.disabled = activeTab === 'home';
  }

  function tabBack() {
    var tab = tabs.find(function(t) { return t.id === activeTab; });
    if (tab) try { tab.frameEl.contentWindow.history.back(); } catch(_) {}
  }
  function tabForward() {
    var tab = tabs.find(function(t) { return t.id === activeTab; });
    if (tab) try { tab.frameEl.contentWindow.history.forward(); } catch(_) {}
  }
  function tabReload() {
    if (activeTab === 'home') { location.reload(); return; }
    var tab = tabs.find(function(t) { return t.id === activeTab; });
    if (tab) {
      var spin = document.getElementById('spin_' + tab.id);
      if (spin) spin.style.display = '';
      if (tab.gameLaunch && tab.gameLoader) {
        tab.gameLoader.classList.remove('is-finishing');
        tab.gameLoader.classList.add('active');
        tab.gameLoader.dataset.startedAt = String(Date.now());
        tab.gameLoader.dataset.finishRequested = '0';
        tab.gameLoader.dataset.failed = '0';
        startGameLoaderTyping(tab.gameLoader);
      }
      try { tab.frameEl.contentWindow.location.reload(); }
      catch(_) { tab.frameEl.src = tab.frameEl.src; }
    }
  }

  return {
    init: init,
    openTab: openTab,
    openBlankGameTab: openBlankGameTab,
    switchTab: switchTab,
    closeTab: closeTab,
    addressGo: addressGo,
    addressFocus: addressFocus,
    addressBlur: addressBlur,
    tabBack: tabBack,
    tabForward: tabForward,
    tabReload: tabReload,
  };
})();
