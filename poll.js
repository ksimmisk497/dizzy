
/* Dizzy live poll — uses the current poll.json and live Cloudflare results */
(function () {
  var POLL_API = "https://poll-api.ksimmisk497.workers.dev";
  var STORAGE_PREFIX = "dizzy_poll_v2:";

  function $(id) {
    return document.getElementById(id);
  }

  function pollId(cfg) {
    var id = cfg && cfg.id != null ? String(cfg.id).trim() : "";
    var q = String(cfg.question || "").trim().toLowerCase();
    var a0 = String(cfg.answers[0] || "").trim().toLowerCase();
    var a1 = String(cfg.answers[1] || "").trim().toLowerCase();

    return (id ? id + "|" : "") + q + "||" + a0 + "||" + a1;
  }

  function storageKey(cfg) {
    return STORAGE_PREFIX + pollId(cfg);
  }

  function hasVoted(cfg) {
    try {
      return localStorage.getItem(storageKey(cfg)) === "1";
    } catch (e) {
      return false;
    }
  }

  function markVoted(cfg) {
    try {
      localStorage.setItem(storageKey(cfg), "1");
      localStorage.setItem(storageKey(cfg) + ":at", String(Date.now()));
    } catch (e) {}
  }

  function injectStyles() {
    if ($("dizzy-poll-style")) return;

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
      "#poll-note{margin-top:8px;font-size:11px;color:#aaa;text-align:center}",
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

  // Supports both percentage formats:
  // [50, 50] and {a: 50, b: 50}
  function getPercentages(data) {
    var a = Number(data.a) || 0;
    var b = Number(data.b) || 0;
    var total = Number(data.total);

    if (!Number.isFinite(total)) {
      total = a + b;
    }

    if (Array.isArray(data.percent)) {
      return [
        Number(data.percent[0]) || 0,
        Number(data.percent[1]) || 0
      ];
    }

    if (data.percent && typeof data.percent === "object") {
      return [
        Number(data.percent.a) || 0,
        Number(data.percent.b) || 0
      ];
    }

    if (!total) return [0, 0];

    var pa = Math.round((a / total) * 100);
    return [pa, 100 - pa];
  }

  function renderResults(cfg, data, picked) {
    var stats = $("poll-stats");
    if (!stats || !data) return;

    var a = cfg.answers[0] || "Option A";
    var b = cfg.answers[1] || "Option B";

    var ca = Number(data.a) || 0;
    var cb = Number(data.b) || 0;
    var total = Number(data.total);

    if (!Number.isFinite(total)) {
      total = ca + cb;
    }

    var percentages = getPercentages({
      a: ca,
      b: cb,
      total: total,
      percent: data.percent
    });

    var pa = percentages[0];
    var pb = percentages[1];

    stats.hidden = false;

    stats.innerHTML =
      '<div class="poll-bar-wrap">' +
        '<div class="poll-bar-label"><span></span><span></span></div>' +
        '<div class="poll-bar"><i></i></div>' +
      "</div>" +
      '<div class="poll-bar-wrap">' +
        '<div class="poll-bar-label"><span></span><span></span></div>' +
        '<div class="poll-bar"><i></i></div>' +
      "</div>";

    var labels = stats.querySelectorAll(".poll-bar-label");
    var bars = stats.querySelectorAll(".poll-bar i");

    labels[0].children[0].textContent = a;
    labels[0].children[1].textContent = pa + "% · " + ca;

    labels[1].children[0].textContent = b;
    labels[1].children[1].textContent = pb + "% · " + cb;

    bars[0].style.width = pa + "%";
    bars[1].style.width = pb + "%";

    $("poll-total").textContent =
      total + " vote" + (total === 1 ? "" : "s");

    document.querySelectorAll(".poll-opt").forEach(function (btn) {
      btn.disabled = true;

      if (
        picked &&
        btn.getAttribute("data-choice") === picked
      ) {
        btn.classList.add("picked");
      }
    });
  }

  async function fetchConfig() {
    var r = await fetch(
      "poll.json?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!r.ok) {
      throw new Error("Could not load the current poll");
    }

    var cfg = await r.json();

    if (
      !cfg ||
      !cfg.question ||
      !Array.isArray(cfg.answers) ||
      cfg.answers.length < 2
    ) {
      throw new Error("Invalid poll configuration");
    }

    return cfg;
  }

  async function fetchResults(question) {
    var r = await fetch(
      POLL_API + "/api/results?q=" +
      encodeURIComponent(question) +
      "&t=" + Date.now(),
      { cache: "no-store" }
    );

    var data = await r.json();

    if (!r.ok) {
      throw new Error(data.error || "Could not load live results");
    }

    return data;
  }

  async function sendVote(question, choice) {
    var r = await fetch(POLL_API + "/api/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question,
        choice: choice
      })
    });

    var data = await r.json();

    if (!r.ok || data.success === false) {
      throw new Error(data.error || "Your vote could not be saved");
    }

    return data;
  }

  function setButtonsDisabled(disabled) {
    document.querySelectorAll(".poll-opt").forEach(function (btn) {
      btn.disabled = disabled;
    });
  }

  async function start() {
    var cfg;

    try {
      cfg = await fetchConfig();
    } catch (e) {
      console.error("[Dizzy Poll]", e);
      return;
    }

    // Don't show the voting popup again after a successful vote.
    if (hasVoted(cfg)) return;

    mount();

    $("poll-from").textContent = cfg.from
      ? "From " + cfg.from
      : "";

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

        setButtonsDisabled(true);
        btn.textContent = "Voting…";
        $("poll-note").textContent = "Saving your vote…";

        try {
          // Only mark voted after Cloudflare confirms success.
          var data = await sendVote(cfg.question, choice);

          markVoted(cfg);

          renderResults(cfg, data, choice);

          $("poll-note").textContent = "Thanks for voting!";
          $("poll-close").hidden = false;

        } catch (err) {
          console.error("[Dizzy Poll]", err);

          $("poll-note").textContent =
            "Vote failed: " + err.message + ". Please try again.";

          setButtonsDisabled(false);
          btn.textContent = cfg.answers[i];
        }
      };

      opts.appendChild(btn);
    });

    $("poll-close").onclick = function () {
      $("poll-overlay").hidden = true;
    };

    // Keep results synchronized with the live Worker after voting.
    setInterval(async function () {
      if (!$("poll-overlay") || $("poll-overlay").hidden) return;
      if (!hasVoted(cfg)) return;

      try {
        var data = await fetchResults(cfg.question);
        renderResults(cfg, data, null);
      } catch (e) {
        console.error("[Dizzy Poll] Refresh failed:", e);
      }
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
