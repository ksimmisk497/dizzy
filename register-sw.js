"use strict";
async function registerSW() {
  if (!navigator.serviceWorker) return;

  // Kill any stale SWs not on the correct scope
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter(r => !r.scope.includes("/ultra-prox/service/"))
      .map(r => { console.log("[WP] removing stale SW:", r.scope); return r.unregister(); })
  );

  if (typeof __uv$config === "undefined") return;

  let reg = await navigator.serviceWorker.getRegistration("/ultra-prox/service/");
  if (!reg) {
    reg = await navigator.serviceWorker.register("/ultra-prox/uv.js", {
      scope: "/ultra-prox/service/"
    });
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
