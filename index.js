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

  async function navigate(raw) {
    clear();

    if (typeof __uv$config === "undefined") {
      show("Proxy config failed to load.");
      return;
    }

    if (typeof registerSW === "function") {
      try { await registerSW(); } catch (err) {
        show("Service worker failed: " + err.message);
        return;
      }
    }

    const base  = new URL(".", location.href).pathname.replace(/\/$/, "");
    const scope = base + "/service/";
    const reg   = await navigator.serviceWorker.getRegistration(scope);
    if (!reg || !reg.active) {
      show("Service worker not active — reload and try again.");
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
