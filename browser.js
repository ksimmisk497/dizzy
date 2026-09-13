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

    // Hijack window.open so game.js and any other script can't spawn real browser tabs
    var _origOpen = window.open.bind(window);
    window.open = function(url, name, features) {
      if (url && url !== 'about:blank' && typeof url === 'string') {
        openTab(url);
        return { focus: function(){}, closed: false, location: { href: url } };
      }
      return _origOpen(url, name, features);
    };

    // Auto-open queued tab from sessionStorage (set by games.html redirect)
    var queued = sessionStorage.getItem('dizzy_open_tab');
    if (queued) {
      sessionStorage.removeItem('dizzy_open_tab');
      waitForUV(function() { openTab(queued); });
    }
  }

  function updateSpacer() {
    if (!chromeEl || !spacer || !contentArea) return;
    var h = chromeEl.offsetHeight;
    spacer.style.height = h + 'px';
    contentArea.style.top = h + 'px';
  }

  function genId() { return 'tab_' + Math.random().toString(36).slice(2,8); }

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
    waitForUV(function() {
      if (typeof registerSW === 'function') {
        Promise.resolve().then(function() { return registerSW(); }).catch(function(){}).then(function() {
          var template = 'https://duckduckgo.com/?q=%s';
          var url = typeof search === 'function' ? search(raw, template) : raw;
          cb(__uv$config.prefix + __uv$config.encodeUrl(url));
        });
      } else {
        var template = 'https://duckduckgo.com/?q=%s';
        var url = typeof search === 'function' ? search(raw, template) : raw;
        cb(__uv$config.prefix + __uv$config.encodeUrl(url));
      }
    });
  }

  function openTab(url) {
    if (!url) { switchTab('home'); return; }
    var id = genId();

    // Tab button
    var tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.id = 'tabEl_' + id;
    tabEl.innerHTML =
      '<div class="tab-favicon-placeholder" id="fav_' + id + '"></div>' +
      '<span class="tab-title" id="title_' + id + '">Loading\u2026</span>' +
      '<div class="tab-loading" id="spin_' + id + '"></div>' +
      '<button class="tab-close" title="Close">\u00d7</button>';
    tabEl.querySelector('.tab-close').onclick = function(e) {
      e.stopPropagation(); closeTab(id);
    };
    tabEl.onclick = function() { switchTab(id); };
    tabBar.insertBefore(tabEl, newTabBtn);

    // iframe
    var frame = document.createElement('iframe');
    frame.className = 'tab-frame';
    frame.id = 'frame_' + id;
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('allow', 'autoplay; fullscreen');
    contentArea.appendChild(frame);

    tabs.push({ id: id, url: url, title: 'Loading\u2026', frameEl: frame, tabEl: tabEl });
    switchTab(id);
    tabEl.scrollIntoView({ behavior: 'smooth', inline: 'end' });

    encodeURL(url, function(proxied) {
      frame.src = proxied;

      frame.addEventListener('load', function() {
        var spin = document.getElementById('spin_' + id);
        if (spin) spin.style.display = 'none';
        try {
          var fdoc = frame.contentDocument || frame.contentWindow.document;
          var title = fdoc.title || url;
          updateTabTitle(id, title);
          var favLink = fdoc.querySelector('link[rel*="icon"]');
          if (favLink) setTabFavicon(id, favLink.href);
        } catch(_) {
          updateTabTitle(id, url);
          try {
            var domain = new URL(url).origin;
            setTabFavicon(id, domain + '/favicon.ico');
          } catch(_) {}
        }
        if (activeTab === id) updateAddressBar(id);
      });
    });
  }

  function switchTab(id) {
    activeTab = id;
    homeFrame.classList.remove('active');
    document.querySelectorAll('.tab-frame').forEach(function(f) { f.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });

    if (id === 'home') {
      homeFrame.classList.add('active');
      var ht = document.getElementById('home-tab');
      if (ht) ht.classList.add('active');
      addressInput.value = homeLabel;
      addressInput.classList.add('home-tab');
      document.title = 'Dizzy';
    } else {
      var tab = tabs.find(function(t) { return t.id === id; });
      if (!tab) return;
      tab.frameEl.classList.add('active');
      tab.tabEl.classList.add('active');
      updateAddressBar(id);
    }
    updateNavBtns();
  }

  function updateAddressBar(id) {
    var tab = tabs.find(function(t) { return t.id === id; });
    if (!tab) return;
    try {
      var src = tab.frameEl.src;
      if (src && typeof __uv$config !== 'undefined' && src.includes(__uv$config.prefix)) {
        var encoded = src.replace(__uv$config.prefix, '');
        addressInput.value = __uv$config.decodeUrl(encoded);
      } else {
        addressInput.value = tab.url;
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
    if (activeTab === id) document.title = title || 'Dizzy';
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
    if (!raw || raw === homeLabel) return;
    if (activeTab === 'home') {
      openTab(raw);
    } else {
      var tab = tabs.find(function(t) { return t.id === activeTab; });
      if (!tab) { openTab(raw); return; }
      encodeURL(raw, function(proxied) {
        tab.frameEl.src = proxied;
        tab.url = raw;
        var spin = document.getElementById('spin_' + tab.id);
        if (spin) spin.style.display = '';
        updateTabTitle(tab.id, 'Loading\u2026');
      });
    }
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
      try { tab.frameEl.contentWindow.location.reload(); }
      catch(_) { tab.frameEl.src = tab.frameEl.src; }
    }
  }

  return {
    init: init,
    openTab: openTab,
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
