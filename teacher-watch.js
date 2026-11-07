
/* Teacher watch warning — best-effort only (browsers cannot reliably detect Classroom screen view) */
(function () {
  if (window.__dizzyTeacherWatch) return;
  window.__dizzyTeacherWatch = true;

  var STYLE = document.createElement("style");
  STYLE.textContent = [
    "#dizzy-teacher-warn{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;",
    "background:rgba(0,0,0,.82);backdrop-filter:blur(8px);font-family:var(--font),system-ui,sans-serif}",
    "#dizzy-teacher-warn.show{display:flex;animation:twIn .25s ease}",
    "@keyframes twIn{from{opacity:0}to{opacity:1}}",
    "#dizzy-teacher-warn .box{max-width:min(420px,92vw);padding:28px 24px;border-radius:18px;text-align:center;",
    "background:#120a1c;border:2px solid #9b5cff;box-shadow:0 0 40px rgba(155,92,255,.45)}",
    "#dizzy-teacher-warn h2{margin:0 0 10px;color:#ff4d6d;font-size:18px;letter-spacing:1px}",
    "#dizzy-teacher-warn p{margin:0 0 16px;color:#f5eaff;font-size:13px;line-height:1.45}",
    "#dizzy-teacher-warn button{padding:10px 16px;border-radius:10px;border:0;background:#9b5cff;color:#fff;",
    "font-weight:700;cursor:pointer}"
  ].join("");
  document.head.appendChild(STYLE);

  var panel = document.createElement("div");
  panel.id = "dizzy-teacher-warn";
  panel.innerHTML = '<div class="box"><h2>WARNING TEACHER IS WATCHING!</h2><p>get off the site stop reading this</p><button type="button" id="dizzy-tw-ok">OK</button></div>';
  function mount() {
    if (!document.body) return setTimeout(mount, 30);
    if (!document.getElementById("dizzy-teacher-warn")) document.body.appendChild(panel);
    var ok = document.getElementById("dizzy-tw-ok");
    if (ok) ok.onclick = function () { panel.classList.remove("show"); };
  }
  mount();

  var lastWarn = 0;
  function warn(reason) {
    var now = Date.now();
    if (now - lastWarn < 8000) return;
    lastWarn = now;
    mount();
    panel.classList.add("show");
    try {
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    } catch (e) {}
    
  }

  // Ask notification permission once (user gesture elsewhere may be needed)
  

  // Heuristics (not perfect — MDM screen view often cannot be seen by the page)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      // store leave time
      window.__dizzyHiddenAt = Date.now();
    } else if (document.visibilityState === "visible" && window.__dizzyHiddenAt) {
      var away = Date.now() - window.__dizzyHiddenAt;
      // Coming back after being away can mean Classroom switch — mild signal only if long
      if (away > 15000) warn("Tab was hidden — possible classroom switch.");
    }
  });

  window.addEventListener("blur", function () {
    window.__dizzyBlurAt = Date.now();
  });
  window.addEventListener("focus", function () {
    if (window.__dizzyBlurAt && Date.now() - window.__dizzyBlurAt > 12000) {
      warn("Window focus lost — possible screen check.");
    }
  });

  // Devtools / resize spikes sometimes used when monitoring tools attach
  var w = window.outerWidth - window.innerWidth;
  setInterval(function () {
    var gap = Math.abs((window.outerWidth - window.innerWidth) - w);
    // ignore small mobile chrome changes
  }, 5000);

  // Manual test: window.dizzyTeacherWarn()
  window.dizzyTeacherWarn = function () { warn("Manual test"); };

  // Optional: enable browser notifications on first click
  
})();
