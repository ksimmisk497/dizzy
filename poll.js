/* Dizzy live poll — shows once per poll. New popup when you change id/question/answers in poll.json */
(function () {
  var POLL_API = "https://poll-api.ksimmisk497.workers.dev";
  var STORAGE_PREFIX = "dizzy_poll_v2:";

  function $(id) { return document.getElementById(id); }

  // Unique per poll. Change id OR question/answers in poll.json → new popup for everyone.
  function pollId(cfg) {
    var id = cfg && cfg.id != null ? String(cfg.id).trim() : "";
    var q = String((cfg && cfg.question) || "").trim().toLowerCase();
    var a0 = String((cfg && cfg.answers && cfg.answers[0]) || "").trim().toLowerCase();
    var a1 = String((cfg && cfg.answers && cfg.answers[1]) || "").trim().toLowerCase();
    // Prefer explicit id; also fold in content so changing the question makes a new poll
    return (id ? id + "|" : "") + q + "||" + a0 + "||" + a1;
  }

  function storageKey(cfg) {
    return STORAGE_PREFIX + pollId(cfg);
  }

  function hasVoted(cfg) {
    try {
      var k = storageKey(cfg);
      if (localStorage.getItem(k) === "1") return true;
      // legacy key support
      var legacy = "dizzy_poll_voted_v1:" + String((cfg && cfg.question) || "").slice(0, 80);
      if (localStorage.getItem(legacy) === "1") {
        localStorage.setItem(k, "1");
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function markVoted(cfg) {
    try {
      localStorage.setItem(storageKey(cfg), "1");
      localStorage.setItem(storageKey(cfg) + ":at", String(Date.now()));
      // also write legacy so old logic stays consistent
      localStorage.setItem("dizzy_poll_voted_v1:" + String(cfg.question || "").slice(0, 80), "1");
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById("dizzy-poll-style")) return;
    var s = document.createElement("style");
    s.id = "dizzy-poll-style";
    s.textContent = [
      "#poll-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(6,6,12,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:'Open Sans',system-ui,sans-serif}",
      "#poll-overlay[hidden]{display:none!important}",
      "#poll-card{width:min(420px,100%);background:rgba(22,22,32,.96);border:1px solid rgba(140,150,255,.22);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:22px 20px 18px;color:#fff}",
      "#poll-from{font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#9a9aab;margin-bottom:8px}",
      "#poll-q{font-size:18px;font-weight:650;line-height:1.35;margin:0 0 16px}",
      "#poll-opts{display:flex;flex-direction:column;gap:10px}",
      ".poll-opt{appearance:none;border:1px solid rgba(140,150,255,.28);background:rgba(108,124,255,.1);color:#fff;border-radius:12px;padding:12px 14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-align:left;transition:.15s}",
      ".poll-opt:hover{background:rgba(108,124,255,.2);border-color:rgba(140,150,255,.5)}",
      ".poll-opt:disabled{opacity:.75;cursor:default}",
      ".poll-opt.picked{border-color:rgba(140,150,255,.85);box-shadow:0 0 0 2px rgba(108,124,255,.25)}",
      "#poll-stats{margin-top:14px;font-size:13px;color:#c8c8d8}",
      ".poll-bar-wrap{margin-top:10px}",
      ".poll-bar-label{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;font-size:12px;color:#b0b0c0}",
      ".poll-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}",
      ".poll-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#6c7cff,#9b8cff);border-radius:99px;transition:width .35s ease}",
      "#poll-total{margin-top:12px;font-size:12px;color:#9a9aab;text-align:center}",
      "#poll-note{margin-top:8px;font-size:11px;color:#777;text-align:center}",
      "#poll-close{margin-top:12px;width:100%;border:1px solid rgba(255,255,255,.12);background:transparent;color:#ccc;border-radius:10px;padding:10px;font:inherit;font-size:13px;cursor:pointer}",
      "#poll-close:hover{color:#fff;border-color:rgba(255,255,255,.25)}",
      "#poll-close[hidden]{display:none!important}"
    ].join("");
    document.head.appendChild(s);
  }

  function mount() {
    injectStyles();
    if ($("poll-overlay")) return;
    var el = document.createElement("div");
    el.id = "poll-overlay";
    el.innerHTML =
      '<div id="poll-card">' +
        '<div id="poll-from"></div>' +
        '<h2 id="poll-q"></h2>' +
        '<div id="poll-opts"></div>' +
        '<div id="poll-stats" hidden></div>' +
        '<div id="poll-total"></div>' +
        '<div id="poll-note"></div>' +
        '<button type="button" id="poll-close" hidden>Continue to Dizzy</button>' +
      "</div>";
    document.body.appendChild(el);
  }

  function renderResults(cfg, data, picked) {
    var stats = $("poll-stats");
    if (!stats) return;
    stats.hidden = false;
    var a = (cfg.answers && cfg.answers[0]) || "Option A";
    var b = (cfg.answers && cfg.answers[1]) || "Option B";
    var pa = (data && data.percent && data.percent.a) || 0;
    var pb = (data && data.percent && data.percent.b) || 0;
    var ca = (data && data.a) || 0;
    var cb = (data && data.b) || 0;
    stats.innerHTML =
      '<div class="poll-bar-wrap">' +
        '<div class="poll-bar-label"><span></span><span></span></div>' +
        '<div class="poll-bar"><i style="width:' + pa + '%"></i></div>' +
      "</div>" +
      '<div class="poll-bar-wrap">' +
        '<div class="poll-bar-label"><span></span><span></span></div>' +
        '<div class="poll-bar"><i style="width:' + pb + '%"></i></div>' +
      "</div>";
    var labels = stats.querySelectorAll(".poll-bar-label");
    labels[0].children[0].textContent = a;
    labels[0].children[1].textContent = pa + "% · " + ca;
    labels[1].children[0].textContent = b;
    labels[1].children[1].textContent = pb + "% · " + cb;
    var total = (data && data.total) || 0;
    $("poll-total").textContent = total + " vote" + (total === 1 ? "" : "s");
    document.querySelectorAll(".poll-opt").forEach(function (btn) {
      btn.disabled = true;
      if (picked && btn.getAttribute("data-choice") === picked) btn.classList.add("picked");
    });
  }

  async function fetchResults(question) {
    var r = await fetch(POLL_API + "/api/results?q=" + encodeURIComponent(question), { cache: "no-store" });
    return await r.json();
  }

  async function sendVote(question, choice) {
    var r = await fetch(POLL_API + "/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question, choice: choice }),
    });
    if (!r.ok) throw new Error("vote failed");
    return await r.json();
  }

  async function start() {
    var cfg;
    try {
      var res = await fetch("poll.json?t=" + Date.now(), { cache: "no-store" });
      cfg = await res.json();
    } catch (e) {
      return;
    }
    if (!cfg || !cfg.question || !cfg.answers || cfg.answers.length < 2) return;

    // CRITICAL: if already voted this poll, never show overlay again
    if (hasVoted(cfg)) return;

    mount();
    $("poll-from").textContent = cfg.from ? ("From " + cfg.from) : "";
    $("poll-q").textContent = cfg.question;

    var opts = $("poll-opts");
    opts.innerHTML = "";
    ["a", "b"].forEach(function (choice, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "poll-opt";
      btn.setAttribute("data-choice", choice);
      btn.textContent = cfg.answers[i];
      btn.onclick = async function () {
        if (hasVoted(cfg)) return;
        var label = cfg.answers[i];
        btn.textContent = "Voting…";
        // Save locally FIRST so refresh won't re-show even if network fails mid-way
        markVoted(cfg);
        try {
          var data = await sendVote(cfg.question, choice);
          renderResults(cfg, data, choice);
          $("poll-note").textContent = "Thanks for voting";
        } catch (err) {
          // still keep voted flag so overlay doesn't spam; show note
          $("poll-note").textContent = "Saved. Results may take a moment.";
          try {
            renderResults(cfg, await fetchResults(cfg.question), choice);
          } catch (e2) {
            renderResults(cfg, { a: 0, b: 0, total: 0, percent: { a: 0, b: 0 } }, choice);
          }
        }
        $("poll-close").hidden = false;
        // Re-check storage wrote correctly
        markVoted(cfg);
      };
      opts.appendChild(btn);
    });

    $("poll-close").onclick = function () {
      markVoted(cfg);
      $("poll-overlay").hidden = true;
    };

    setInterval(async function () {
      if (!$("poll-overlay") || $("poll-overlay").hidden) return;
      if (!hasVoted(cfg)) return;
      try {
        renderResults(cfg, await fetchResults(cfg.question), null);
      } catch (e) {}
    }, 3000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
