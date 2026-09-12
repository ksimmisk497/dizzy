"use strict";
async function registerSW() {
  if (!navigator.serviceWorker) return;

  // Figure out the base path dynamically so this works on any deploy
  // e.g. ksimmisk497.github.io/ultra-prox/ or a custom domain
  const base = new URL(".", location.href).pathname.replace(/\/$/, "");
  const scope = base + "/service/";
  const swUrl = base + "/uv.js";

  // Kill any SW not on our scope
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter(r => !r.scope.endsWith("/service/"))
      .map(r => { console.log("[WP] removing stale SW:", r.scope); return r.unregister(); })
  );

  if (typeof __uv$config === "undefined") return;

  let reg = await navigator.serviceWorker.getRegistration(scope);
  if (!reg) {
    reg = await navigator.serviceWorker.register(swUrl, { scope });
    console.log("[WP] SW registered, scope:", reg.scope);
  }

  await new Promise((resolve) => {
    if (reg.active && !reg.installing && !reg.waiting) { resolve(); return; }
    const sw = reg.installing || reg.waiting;
    if (!sw) { resolve(); return; }
    sw.addEventListener("statechange", function h() {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", h);
        resolve();
      }
    });
    setTimeout(resolve, 4000);
  });
}
