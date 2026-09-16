"use strict";
async function initUV() {
  var form = document.getElementById("uv-form");
  var address = document.getElementById("uv-address");
  var engine = document.getElementById("uv-search-engine");
  var errEl = document.getElementById("uv-error");
  var codeEl = document.getElementById("uv-error-code");

  function show(msg, detail) {
    if (errEl) errEl.textContent = msg || "";
    if (codeEl) codeEl.textContent = detail || "";
  }

  if (location.protocol === "file:" || location.origin === "null") {
    show(
      "Do not open index.html from your computer.",
      "Upload to GitHub Pages and use https://YOURUSER.github.io/REPO/"
    );
    return;
  }

  if (!form || !address) return;

  if (typeof registerSW === "function") {
    try {
      await registerSW();
    } catch (e) {
      show("SW failed: " + (e && e.message ? e.message : e));
    }
  }

  async function navigate(raw) {
    show("", "");
    if (location.protocol === "file:" || location.origin === "null") {
      show("Use your GitHub Pages HTTPS link, not a local file.");
      return;
    }
    if (typeof __uv$config === "undefined") {
      show("Config failed to load.");
      return;
    }
    if (typeof registerSW === "function") {
      try {
        await registerSW();
      } catch (err) {
        show("SW failed: " + (err && err.message ? err.message : err));
        return;
      }
    }
    var template = (engine && engine.value) || "https://www.startpage.com/sp/search?query=%s";
    if (/search\.brave\.com|brave\.com/i.test(template)) {
      template = "https://www.startpage.com/sp/search?query=%s";
    }
    var url = typeof search === "function" ? search(raw, template) : raw;
    location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var raw = address.value.trim();
    if (raw) await navigate(raw);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUV);
} else {
  initUV();
}
