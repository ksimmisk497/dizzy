"use strict";
async function initUV() {
  const form    = document.getElementById("uv-form");
  const address = document.getElementById("uv-address");
  const engine  = document.getElementById("uv-search-engine");
  const errEl   = document.getElementById("uv-error");
  const codeEl  = document.getElementById("uv-error-code");

  function show(msg, detail) {
    if (errEl)  errEl.textContent  = msg;
    if (codeEl) codeEl.textContent = detail || "";
  }
  function clear() { show("", ""); }

  if (!form || !address) return;

  if (typeof registerSW === "function") {
    try { await registerSW(); } catch (_) {}
  }

  // Probe bare servers and return the first live one
  async function findLiveBare(servers) {
    if (!Array.isArray(servers)) return null;
    for (const s of servers) {
      try {
        const url = typeof s === "string" ? s : s.href;
        const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
        // Bare servers return 400/405 on HEAD to root — anything that isn't a network error is live
        if (res.status < 500) return url;
      } catch (_) { /* dead, try next */ }
    }
    return null;
  }

  async function navigate(raw) {
    clear();

    if (typeof __uv$config === "undefined") {
      show("Proxy config failed to load. Check the Network tab for 404s.");
      return;
    }

    if (typeof registerSW === "function") {
      try { await registerSW(); } catch (err) {
        show("Service worker failed: " + err.message);
        return;
      }
    }

    const reg = await navigator.serviceWorker.getRegistration("/ultra-prox/service/");
    if (!reg || !reg.active) {
      show("Service worker not active yet — reload the page and try again.");
      return;
    }

    // Verify at least one bare server is reachable before navigating
    const servers = Array.isArray(__uv$config.bare)
      ? __uv$config.bare
      : [__uv$config.bare];
    const live = await findLiveBare(servers);
    if (!live) {
      show(
        "All bare servers are unreachable.",
        "The proxy backend is down. Try again later or self-host a bare server.\n" +
        "Tried: " + servers.join(", ")
      );
      return;
    }

    const template = (engine && engine.value) || "https://www.google.com/search?q=%s";
    const url = typeof search === "function" ? search(raw, template) : raw;
    location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = address.value.trim();
    if (!raw) return;
    await navigate(raw);
  });

  address.addEventListener("keydown", e => {
    if (e.key === "Enter") form.dispatchEvent(new Event("submit"));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUV);
} else {
  initUV();
}
