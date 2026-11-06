"use strict";
(function (global) {
  var CDN = "https://cdn.jsdelivr.net";
  var FALLBACK_IMG = "favicon.png";

  var STASH = {
    all: "All",
    ubz: "UNBL0CKEDZ0NE",
    gn: "GN-Math",
    daknux: "Daknux",
    kh0: "3kh0 Lite",
    kh3: "3kh0",
    ugs: "UGS Stash",
    seraph: "Seraph",
    ckv: "Chicken Kings Vault",
    blox: "Blox",
    bloxy: "Bloxy",
    yt: "YouTube Playables",
    nebula: "Nebula",
    elite: "Elite",
    hydra: "Hydra",
    diesmos: "Diesmos",
    gclass: "Google Class",
    cc: "CCPorted",
    alexr: "Alexr",
    noah: "Noah's Tutoring",
    lumin: "Lumin"
  };

  var DATA = {};
  Object.keys(STASH).forEach(function (k) {
    if (k !== "all") DATA[k] = [];
  });

  function norm(g, stash) {
    if (!g) return null;
    var name = String(g.name || g.title || "").trim();
    var url = String(g.url || g.file || g.html || g.path || "").trim();
    var img = String(g.img || g.image || g.cover || "").trim();
    if (!name || !url || url === "#") return null;
    if (!img) img = FALLBACK_IMG;
    return { name: name, url: url, img: img, stash: stash };
  }

  function toJsDelivr(url) {
    try {
      var u = String(url || "");
      // raw.githubusercontent.com/user/repo/branch/path -> cdn.jsdelivr.net/gh/user/repo@branch/path
      var m = u.match(/^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/i);
      if (m) {
        return "https://cdn.jsdelivr.net/gh/" + m[1] + "/" + m[2] + "@" + m[3] + "/" + m[4];
      }
      // github.com/user/repo/blob/branch/path
      m = u.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/i);
      if (m) {
        return "https://cdn.jsdelivr.net/gh/" + m[1] + "/" + m[2] + "@" + m[3] + "/" + m[4];
      }
      return u;
    } catch (e) {
      return url;
    }
  }

  function proxiedUrl(url) {
    try {
      if (typeof __uv$config !== "undefined" && __uv$config.prefix && __uv$config.encodeUrl) {
        var origin = location.origin || "";
        return origin + __uv$config.prefix + __uv$config.encodeUrl(url);
      }
    } catch (e) {}
    return null;
  }

  function openViaSrcdoc(html, baseUrl, title) {
    try {
      var base = baseUrl.replace(/\/[^\/]*$/, "/");
      if (html.indexOf("<base") === -1) {
        html = html.replace(
          /<head([^>]*)>/i,
          '<head$1><base href="' + base.replace(/"/g, "&quot;") + '">'
        );
        if (html.indexOf("<base") === -1) {
          html = '<base href="' + base.replace(/"/g, "&quot;") + '">' + html;
        }
      }
      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      var blobUrl = URL.createObjectURL(blob);
      if (window.BrowserTabs && typeof BrowserTabs.openTab === "function") {
        BrowserTabs.openTab(blobUrl, title || "Game");
        return true;
      }
      window.open(blobUrl, "_blank");
      return true;
    } catch (e) {
      return false;
    }
  }

  function openGame(url, title) {
    if (!url) return;
    url = toJsDelivr(url);

    // 1) Prefer UV proxy — rewrites assets and serves as real HTML page
    var viaProxy = proxiedUrl(url);
    if (viaProxy) {
      if (window.BrowserTabs && typeof BrowserTabs.openTab === "function") {
        BrowserTabs.openTab(viaProxy, title || "Game");
        return;
      }
      window.open(viaProxy, "_blank");
      return;
    }

    // 2) Fetch HTML and embed as blob (fixes text/plain / "shows source code")
    fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("bad status");
        return r.text();
      })
      .then(function (text) {
        var looksHtml = /^\s*</.test(text) || /<html[\s>]/i.test(text) || /<!doctype/i.test(text);
        if (looksHtml && openViaSrcdoc(text, url, title)) return;
        // fallback: open URL directly in tab
        if (window.BrowserTabs && typeof BrowserTabs.openTab === "function") {
          BrowserTabs.openTab(url, title || "Game");
        } else {
          window.open(url, "_blank");
        }
      })
      .catch(function () {
        if (window.BrowserTabs && typeof BrowserTabs.openTab === "function") {
          BrowserTabs.openTab(url, title || "Game");
        } else {
          window.open(url, "_blank");
        }
      });
  }

  async function j(url) {
    var r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }

  async function loadUBZ() {
    if (DATA.ubz.length) return DATA.ubz;
    var d = await j(CDN + "/gh/s0n-1m-cr1n3/sc13nc3/assets/data.json");
    var arr = Array.isArray(d) ? d : d.games || [];
    DATA.ubz = arr.map(function (g) { return norm(g, "ubz"); }).filter(Boolean);
    return DATA.ubz;
  }

  async function loadGN() {
    if (DATA.gn.length) return DATA.gn;
    var htmlBase = CDN + "/gh/freebuisness/html@main";
    var coverBase = CDN + "/gh/freebuisness/covers@main";
    var d = await j(CDN + "/gh/freebuisness/assets/zones.json");
    DATA.gn = (d || []).filter(function (g) {
      return g && g.id !== -1 && g.id !== undefined && g.name && String(g.name).indexOf("[!]") !== 0;
    }).map(function (g) {
      var gu = String(g.url || "").replace(/\{HTML_URL\}/g, htmlBase).replace(/\{COVER_URL\}/g, coverBase).trim();
      var cover = String(g.cover || "").replace(/\{COVER_URL\}/g, coverBase).trim();
      if (!gu.startsWith("http")) gu = htmlBase + "/" + g.id + ".html";
      if (cover && !cover.startsWith("http")) cover = coverBase + "/" + cover;
      return norm({ name: g.name, url: gu, img: cover || FALLBACK_IMG }, "gn");
    }).filter(Boolean);
    return DATA.gn;
  }

  async function loadDaknux() {
    if (DATA.daknux.length) return DATA.daknux;
    var htmlBase = CDN + "/gh/daknux/html@main";
    var coverBase = CDN + "/gh/daknux/covers@main";
    var d;
    try { d = await j(CDN + "/gh/daknux/assets@latest/zones.json"); }
    catch (e) { d = await j(CDN + "/gh/daknux/assets@master/zones.json"); }
    DATA.daknux = (d || []).filter(function (g) {
      return g && g.id !== undefined && g.id >= 0 && g.name && String(g.name).indexOf("[!]") !== 0;
    }).map(function (g) {
      var gu = String(g.url || "").replace(/\{HTML_URL\}/g, htmlBase).replace(/\{COVER_URL\}/g, coverBase).trim();
      var cover = String(g.cover || "").replace(/\{COVER_URL\}/g, coverBase).trim();
      if (!gu.startsWith("http")) gu = htmlBase + "/" + g.id + ".html";
      if (cover && !cover.startsWith("http")) cover = coverBase + "/" + cover;
      return norm({ name: g.name, url: gu, img: cover || FALLBACK_IMG }, "daknux");
    }).filter(Boolean);
    return DATA.daknux;
  }

  async function loadKh0() {
    if (DATA.kh0.length) return DATA.kh0;
    var base = CDN + "/gh/3kh0/3kh0-lite@main";
    try {
      var r = await fetch("https://api.github.com/repos/3kh0/3kh0-lite/git/trees/main?recursive=1");
      var tree = (await r.json()).tree || [];
      DATA.kh0 = tree.filter(function (f) {
        return f.type === "blob" && /\.html?$/i.test(f.path) && f.path.indexOf("/") === -1;
      }).map(function (f) {
        return norm({ name: f.path.replace(/\.html?$/i, ""), url: base + "/" + f.path, img: FALLBACK_IMG }, "kh0");
      }).filter(Boolean);
    } catch (e) { DATA.kh0 = []; }
    return DATA.kh0;
  }

  async function loadKh3() {
    if (DATA.kh3.length) return DATA.kh3;
    var KH3_BASE = CDN + "/gh/tharun9772/3kh0-assets@main";
    var CC_BASE = CDN + "/gh/tharun9772/game-assets@main";
    var d = await j(CC_BASE + "/3kh0/3kh0-assets.json");
    DATA.kh3 = (Array.isArray(d) ? d : []).filter(function (n) {
      return typeof n === "string" && n.trim();
    }).map(function (nm) {
      var enc = encodeURIComponent(nm);
      return norm({
        name: nm.replace(/[-_]+/g, " "),
        img: KH3_BASE + "/" + enc + "/splash.png",
        url: KH3_BASE + "/" + enc + "/index.html"
      }, "kh3");
    }).filter(Boolean);
    return DATA.kh3;
  }

  async function loadUGS() {
    if (DATA.ugs.length) return DATA.ugs;
    var seen = {}, list = [];
    function push(name, url) {
      if (!name || !url || seen[url]) return;
      seen[url] = 1;
      list.push(norm({ name: name, url: url, img: FALLBACK_IMG }, "ugs"));
    }
    ["tharun9772/ugs-1", "tharun9772/ugs-2", "tharun9772/ugs-3"].forEach(function () {});
    for (var i = 0; i < 3; i++) {
      var repo = ["tharun9772/ugs-1", "tharun9772/ugs-2", "tharun9772/ugs-3"][i];
      try {
        var r = await fetch("https://api.github.com/repos/" + repo + "/contents/");
        var d = await r.json();
        if (!Array.isArray(d)) continue;
        d.forEach(function (f) {
          if (f.type === "file" && /^cl.+\.html$/i.test(f.name)) {
            push(f.name.replace(/^cl/i, "").replace(/\.html$/i, ""), CDN + "/gh/" + repo + "/" + f.name);
          }
        });
      } catch (e) {}
    }
    try {
      var base = CDN + "/gh/bubbls/ugs-singlefile@main";
      var t = await (await fetch(base + "/games.js")).text();
      var m, re = /"(cl[^"]+)"/g;
      while ((m = re.exec(t))) {
        push(m[1].replace(/^cl/, ""), base + "/UGS-Files/" + m[1] + ".html");
      }
    } catch (e) {}
    DATA.ugs = list.filter(Boolean);
    return DATA.ugs;
  }

  async function loadSeraph() {
    if (DATA.seraph.length) return DATA.seraph;
    var base = CDN + "/gh/a456pur/seraph@main/games/";
    var d = await j(CDN + "/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json");
    DATA.seraph = (d || []).map(function (g) {
      var si = String(g.img || "").trim();
      if (si && !si.startsWith("http")) si = base + si.replace(/^\//, "");
      return norm({ name: g.name, url: g.url, img: si || FALLBACK_IMG }, "seraph");
    }).filter(Boolean);
    return DATA.seraph;
  }

  async function loadCKV() {
    if (DATA.ckv.length) return DATA.ckv;
    var base = CDN + "/gh/carbonicality/ChickenKingsVault@main";
    var d = await j(base + "/games.json");
    DATA.ckv = (d || []).map(function (g) {
      var cu = String(g.html || "").trim();
      var ci = g.img ? (String(g.img).startsWith("http") ? g.img : base + "/images/" + g.img) : FALLBACK_IMG;
      var url = cu && !cu.startsWith("http") ? base + "/g4mesfiles/" + cu.replace(/^\//, "") : cu;
      return norm({ name: g.name, url: url, img: ci }, "ckv");
    }).filter(Boolean);
    return DATA.ckv;
  }

  async function loadBlox() {
    if (DATA.blox.length) return DATA.blox;
    var base = CDN + "/gh/tharun9772/Bloxcraft-UBG@main";
    var d = await j(CDN + "/gh/s0n-1m-cr1n3/sc13nc3/assets/blox.json");
    DATA.blox = (Array.isArray(d) ? d : d.games || []).map(function (g) {
      var u = String(g.url || "").trim();
      var full = u ? (u.startsWith("http") ? u : base + (u.startsWith("/") ? u : "/" + u)) : "";
      return norm({ name: g.name, url: full, img: g.img || FALLBACK_IMG }, "blox");
    }).filter(Boolean);
    return DATA.blox;
  }

  async function loadBloxy() {
    if (DATA.bloxy.length) return DATA.bloxy;
    var out = [], seen = {};
    async function one(base) {
      try {
        var d = await j(base + "/cdn-data/g.json");
        (Array.isArray(d) ? d : []).forEach(function (g) {
          var nm = String(g.name || "").trim();
          if (!nm || seen[nm.toLowerCase()]) return;
          seen[nm.toLowerCase()] = 1;
          out.push(norm({ name: nm, url: base + "/" + encodeURIComponent(nm) + ".html", img: FALLBACK_IMG }, "bloxy"));
        });
      } catch (e) {}
    }
    await one(CDN + "/gh/bloxys-playables/html-files@main");
    await one(CDN + "/gh/bloxys-playables/emulator-files@main");
    DATA.bloxy = out;
    return DATA.bloxy;
  }

  async function loadYt() {
    if (DATA.yt.length) return DATA.yt;
    var CC_BASE = CDN + "/gh/tharun9772/game-assets@main";
    var d = await j(CC_BASE + "/libraries/youtube/gms.json");
    DATA.yt = (Array.isArray(d) ? d : []).map(function (g) {
      return norm({ name: g.name || g.title, url: g.url, img: g.img || g.image || FALLBACK_IMG }, "yt");
    }).filter(Boolean);
    return DATA.yt;
  }

  async function loadNebula() {
    if (DATA.nebula.length) return DATA.nebula;
    var base = CDN + "/gh/GoatTech-42/NEBULA-CDN@main";
    var d = await j(base + "/games.json");
    var arr = Array.isArray(d) ? d : d.games || [];
    DATA.nebula = arr.map(function (g) {
      var file = String(g.file || "").trim();
      if (!file) return null;
      return norm({ name: g.name || g.title, url: base + "/" + file.replace(/^\//, ""), img: FALLBACK_IMG }, "nebula");
    }).filter(Boolean);
    return DATA.nebula;
  }

  async function loadElite() {
    if (DATA.elite.length) return DATA.elite;
    var ELITE_BASE = CDN + "/gh/1234chromebook1234-creator/ww@main";
    try {
      var d = await j(ELITE_BASE + "/games.json");
      DATA.elite = (Array.isArray(d) ? d : []).map(function (g) {
        var eu = String(g.url || "").trim();
        var ei = g.image ? (String(g.image).startsWith("http") ? g.image : ELITE_BASE + "/" + String(g.image).replace(/^\//, "")) : FALLBACK_IMG;
        var url = eu && !eu.startsWith("http") ? ELITE_BASE + "/" + eu.replace(/^\//, "") : eu;
        return norm({ name: g.title || g.name, url: url, img: ei }, "elite");
      }).filter(Boolean);
    } catch (e) { DATA.elite = []; }
    return DATA.elite;
  }

  async function loadHydra() {
    if (DATA.hydra.length) return DATA.hydra;
    var HYDRA_BASE = CDN + "/gh/zennedu/hydra@main";
    try {
      var d = await j(HYDRA_BASE + "/gmes.json");
      DATA.hydra = (Array.isArray(d) ? d : []).map(function (g) {
        var file = String(g.file_name || "").trim();
        var thumb = String(g.thumb || "").trim();
        return norm({
          name: (g.title && String(g.title).trim()) || file.replace(/\.html$/i, ""),
          img: thumb ? HYDRA_BASE + "/" + thumb.replace(/^\//, "") : FALLBACK_IMG,
          url: file ? HYDRA_BASE + "/gmes/" + file : ""
        }, "hydra");
      }).filter(Boolean);
    } catch (e) { DATA.hydra = []; }
    return DATA.hydra;
  }

  async function loadDiesmos() {
    if (DATA.diesmos.length) return DATA.diesmos;
    var BASE = CDN + "/gh/aDiesmos/HTMLFILES@main";
    var IMG = CDN + "/gh/aDiesmos/images@main";
    try {
      var r = await fetch("https://api.github.com/repos/aDiesmos/HTMLFILES/git/trees/main?recursive=1");
      var tree = (await r.json()).tree || [];
      var seen = {};
      DATA.diesmos = [];
      tree.forEach(function (f) {
        if (!f || f.type !== "blob" || !/\.html$/i.test(f.path)) return;
        var base = f.path.split("/").pop();
        if (/^(index|404|test|testing|examples?|template)\.html$/i.test(base)) return;
        var name = base.replace(/\.html$/i, "");
        if (seen[name.toLowerCase()]) return;
        seen[name.toLowerCase()] = 1;
        DATA.diesmos.push(norm({
          name: name.replace(/[-_]+/g, " "),
          img: IMG + "/" + name + ".jpg",
          url: BASE + "/" + f.path
        }, "diesmos"));
      });
    } catch (e) { DATA.diesmos = []; }
    return DATA.diesmos;
  }

  async function loadGclass() {
    if (DATA.gclass.length) return DATA.gclass;
    var BASE = CDN + "/gh/bloxcraft-st/google-class-files@main";
    var d = await j(BASE + "/assets/games.json");
    DATA.gclass = (Array.isArray(d) ? d : []).map(function (g) {
      var file = String(g.url || "").trim();
      return norm({
        name: g.name,
        img: g.img || g.image || FALLBACK_IMG,
        url: file ? (file.startsWith("http") ? file : BASE + "/" + file.replace(/^\//, "")) : ""
      }, "gclass");
    }).filter(Boolean);
    return DATA.gclass;
  }

  async function loadCc() {
    if (DATA.cc.length) return DATA.cc;
    var CC_BASE = CDN + "/gh/tharun9772/game-assets@main";
    var d = await j(CC_BASE + "/ccported-stupid-game-lib.json");
    DATA.cc = (Array.isArray(d) ? d : []).map(function (g) {
      var base = String(g.base || "").trim().replace(/\/+$/, "");
      return norm({ name: g.name, url: base ? base + "/index.html" : "", img: FALLBACK_IMG }, "cc");
    }).filter(Boolean);
    return DATA.cc;
  }

  async function loadAlexr() {
    if (DATA.alexr.length) return DATA.alexr;
    var BASE = CDN + "/gh/dskjfoisjfsjio/alexrsworld@main";
    var d = await j(BASE + "/singlefilegames.json");
    DATA.alexr = (Array.isArray(d) ? d : []).map(function (g) {
      return norm({ name: g.title || g.name, img: g.img || g.image || FALLBACK_IMG, url: g.path || g.url || "" }, "alexr");
    }).filter(Boolean);
    return DATA.alexr;
  }

  async function loadNoah() {
    if (DATA.noah.length) return DATA.noah;
    var NOAH_BASE = CDN + "/gh/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor@master";
    try {
      var text = await (await fetch(CDN + "/gh/Onex558/uranium-source-@main/nth.js")).text();
      var out = [];
      var objRegex = /\{([^}]+)\}/g, match;
      while ((match = objRegex.exec(text))) {
        var block = match[1];
        var titleM = block.match(/title:\s*["'](.+?)["']/);
        var urlM = block.match(/url:\s*["'](.+?)["']/);
        var imageM = block.match(/image:\s*["'](.+?)["']/);
        if (titleM && urlM) {
          var img = imageM ? imageM[1] : "";
          if (img && !img.startsWith("http")) img = NOAH_BASE + "/images/" + img;
          var u = urlM[1];
          if (u && !u.startsWith("http")) u = CDN + "/gh/" + u.replace(/^\//, "");
          out.push(norm({ name: titleM[1], img: img || FALLBACK_IMG, url: u }, "noah"));
        }
      }
      DATA.noah = out.filter(Boolean);
    } catch (e) { DATA.noah = []; }
    return DATA.noah;
  }

  async function loadLumin() {
    if (DATA.lumin.length) return DATA.lumin;
    var htmlBase = CDN + "/gh/freebuisness/html@main";
    var coverBase = CDN + "/gh/freebuisness/covers@main";
    try {
      var zoneData = await j(CDN + "/gh/freebuisness/assets@main/zones.json");
      var g4mes = [];
      (zoneData || []).forEach(function (z) {
        if (!z || typeof z !== "object") return;
        var url = String(z.url || "").trim();
        if (!url) return;
        url = url.replace(/\{HTML_URL\}/g, htmlBase).replace(/\{COVER_URL\}/g, coverBase);
        if (!url.startsWith(CDN) || url.indexOf("{") !== -1) return;
        var img = String(z.cover || "").trim();
        if (img) {
          img = img.replace(/\{HTML_URL\}/g, htmlBase).replace(/\{COVER_URL\}/g, coverBase);
          if (!img.startsWith("http")) img = FALLBACK_IMG;
        } else img = FALLBACK_IMG;
        g4mes.push(norm({ name: String(z.name || "").trim() || ("Zone " + z.id), img: img, url: url }, "lumin"));
      });
      var seen = {};
      DATA.lumin = g4mes.filter(function (g) {
        if (!g || seen[g.url]) return false;
        seen[g.url] = 1;
        return true;
      });
    } catch (e) { DATA.lumin = []; }
    return DATA.lumin;
  }

  var LOADERS = {
    ubz: loadUBZ, gn: loadGN, daknux: loadDaknux, kh0: loadKh0, kh3: loadKh3,
    ugs: loadUGS, seraph: loadSeraph, ckv: loadCKV, blox: loadBlox, bloxy: loadBloxy,
    yt: loadYt, nebula: loadNebula, elite: loadElite, hydra: loadHydra,
    diesmos: loadDiesmos, gclass: loadGclass, cc: loadCc, alexr: loadAlexr,
    noah: loadNoah, lumin: loadLumin
  };

  async function loadStash(key) {
    if (key === "all") {
      var keys = Object.keys(LOADERS);
      await Promise.all(keys.map(function (k) {
        return LOADERS[k]().catch(function () { return []; });
      }));
      var all = [], seen = {};
      keys.forEach(function (k) {
        (DATA[k] || []).forEach(function (g) {
          if (!g || !g.url || seen[g.url]) return;
          seen[g.url] = 1;
          all.push(g);
        });
      });
      return all;
    }
    if (!LOADERS[key]) return [];
    try { return await LOADERS[key](); }
    catch (e) { console.warn(key, e); return DATA[key] || []; }
  }

  global.DizzyGames = {
    STASH: STASH,
    loadStash: loadStash,
    openGame: openGame,
    FALLBACK_IMG: FALLBACK_IMG
  };
})(window);
