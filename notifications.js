"use strict";
(function () {
  var READ_KEY = "dizzy_notify_read_v1";
  var FEED_URLS = ["notifications.json", "./notifications.json"];
  var feed = [];

  function loadRead() {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveRead(map) {
    try { localStorage.setItem(READ_KEY, JSON.stringify(map || {})); } catch (e) {}
  }
  function msgId(m, i) {
    return m.id || ("n_" + i + "_" + String(m.title || m.Title || "").slice(0, 40));
  }
  function normalize(m, i) {
    if (!m || typeof m !== "object") return null;
    return {
      id: msgId(m, i),
      title: m.title || m.Title || "",
      body: m.body || m.Body || m.text || m.message || "",
      from: m.from || m.From || m.author || "Wes"
    };
  }
  function unreadCount() {
    var read = loadRead();
    return feed.filter(function (m) { return !read[m.id]; }).length;
  }
  function markAllRead() {
    var read = loadRead();
    feed.forEach(function (m) { read[m.id] = true; });
    saveRead(read);
    updateDot();
  }
  function updateDot() {
    var n = unreadCount();
    document.querySelectorAll(".dz-notify-dot").forEach(function (el) {
      if (n > 0) {
        el.hidden = false;
        el.style.display = "block";
        el.textContent = n > 9 ? "9+" : String(n);
      } else {
        el.hidden = true;
        el.style.display = "none";
      }
    });
  }

  function ensureStyles() {
    if (document.getElementById("dz-notify-styles")) return;
    var s = document.createElement("style");
    s.id = "dz-notify-styles";
    s.textContent = [
      ".rail{height:100vh!important;height:100dvh!important;min-height:100%!important}",
      ".rail-spacer{flex:1 1 auto!important;min-height:8px!important}",
      ".rail a.dz-notify-btn{position:relative;flex-shrink:0;margin-top:0}",
      ".dz-notify-dot{position:absolute;top:4px;right:4px;min-width:14px;height:14px;padding:0 3px;border-radius:999px;",
      "background:#e11d48;color:#fff;font-size:9px;font-weight:800;line-height:14px;text-align:center;",
      "display:none;box-shadow:0 0 0 2px #0a0612}",
      "#dz-notify-panel{position:fixed;left:calc(var(--rail,84px) + 12px);bottom:16px;width:min(340px,calc(100vw - 100px));",
      "max-height:min(420px,60vh);overflow:auto;z-index:300;background:rgba(12,6,22,.97);border:1px solid rgba(155,92,255,.35);",
      "border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.55);display:none}",
      "#dz-notify-panel.open{display:block}",
      "#dz-notify-panel header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(155,92,255,.2)}",
      "#dz-notify-panel header strong{font-size:13px;color:#f5eaff}",
      "#dz-notify-panel header button{background:transparent;border:0;color:#b89ad4;cursor:pointer;font-size:12px;font-weight:700}",
      ".dz-n-item{padding:12px 14px;border-bottom:1px solid rgba(155,92,255,.12)}",
      ".dz-n-item.unread{background:rgba(155,92,255,.1)}",
      ".dz-n-from{font-size:11px;font-weight:800;color:#c084fc}",
      ".dz-n-title{font-size:13px;font-weight:700;color:#fff;margin-top:4px}",
      ".dz-n-msg{font-size:12px;color:#c8b8e0;margin-top:4px;line-height:1.4;white-space:pre-wrap;word-break:break-word}",
      ".dz-n-empty{padding:28px 14px;text-align:center;color:#7a5a9a;font-size:13px}"
    ].join("");
    document.head.appendChild(s);
  }

  function ensurePanel() {
    if (document.getElementById("dz-notify-panel")) return;
    ensureStyles();
    var panel = document.createElement("div");
    panel.id = "dz-notify-panel";
    panel.innerHTML =
      "<header><strong>Notifications</strong><button type='button' id='dz-n-clear'>Mark read</button></header>" +
      "<div id='dz-n-list'><div class='dz-n-empty'>Loading…</div></div>";
    document.body.appendChild(panel);
    document.getElementById("dz-n-clear").addEventListener("click", function () {
      markAllRead();
      renderPanel();
    });
    document.addEventListener("click", function (e) {
      var panel = document.getElementById("dz-notify-panel");
      if (e.target.closest && e.target.closest(".dz-notify-btn")) return;
      if (panel && !panel.contains(e.target)) panel.classList.remove("open");
    });
  }

  function renderPanel() {
    ensurePanel();
    var list = document.getElementById("dz-n-list");
    if (!list) return;
    var read = loadRead();
    if (!feed.length) {
      list.innerHTML = "<div class='dz-n-empty'>No notifications</div>";
      return;
    }
    list.innerHTML = "";
    feed.forEach(function (m) {
      var div = document.createElement("div");
      div.className = "dz-n-item" + (read[m.id] ? "" : " unread");
      div.innerHTML = "<div class='dz-n-from'></div><div class='dz-n-title'></div><div class='dz-n-msg'></div>";
      div.querySelector(".dz-n-from").textContent = m.from;
      div.querySelector(".dz-n-title").textContent = m.title;
      div.querySelector(".dz-n-msg").textContent = m.body;
      list.appendChild(div);
    });
  }

  function togglePanel() {
    ensurePanel();
    var panel = document.getElementById("dz-notify-panel");
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      pull().then(function () {
        renderPanel();
        markAllRead();
        renderPanel();
      });
    }
  }

  async function pull() {
    for (var i = 0; i < FEED_URLS.length; i++) {
      try {
        var res = await fetch(FEED_URLS[i] + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) continue;
        var data = await res.json();
        var raw = Array.isArray(data) ? data : (data.messages || data.notifications || []);
        feed = raw.map(normalize).filter(Boolean);
        updateDot();
        return feed;
      } catch (e) {}
    }
    return feed;
  }

  function injectBell() {
    ensureStyles();
    var rail = document.querySelector(".rail");
    if (!rail) return;
    if (rail.querySelector(".dz-notify-btn")) return;

    // Ensure full-height rail
    rail.style.position = "fixed";
    rail.style.top = "0";
    rail.style.bottom = "0";
    rail.style.left = "0";
    rail.style.height = "100vh";
    rail.style.display = "flex";
    rail.style.flexDirection = "column";

    var spacer = rail.querySelector(".rail-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "rail-spacer";
      rail.appendChild(spacer);
    }
    spacer.style.flex = "1 1 auto";
    spacer.style.minHeight = "8px";

    var a = document.createElement("a");
    a.href = "#";
    a.className = "dz-notify-btn";
    a.setAttribute("data-label", "Notifications");
    a.title = "Notifications";
    a.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>' +
      '<span class="dz-notify-dot">0</span>';
    a.addEventListener("click", function (e) {
      e.preventDefault();
      togglePanel();
    });
    // After spacer = bottom of sidebar
    rail.appendChild(a);
  }

  function boot() {
    injectBell();
    ensurePanel();
    pull().then(updateDot);
    setInterval(function () { pull().then(updateDot); }, 20000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
