"use strict";
/**
 * @param {string} input
 * @param {string} template Template for a search query (must contain %s).
 * @returns {string} Fully qualified URL
 */
function getDizzySearchEngine() {
  try {
    var saved = localStorage.getItem('dizzy_search_engine');
    if (saved) return saved;
  } catch (e) {}
  return 'dizzy';
}

function getDizzySearchTemplate() {
  var engines = {
    // Dizzy uses DuckDuckGo's search endpoint as its backend, while the
    // surrounding UI remains fully branded as DIZZY.
    dizzy: 'https://duckduckgo.com/?q=%s',
    duckduckgo: 'https://duckduckgo.com/?q=%s',
    google: 'https://www.google.com/search?q=%s',
    bing: 'https://www.bing.com/search?q=%s',
    yahoo: 'https://search.yahoo.com/search?p=%s'
  };
  return engines[getDizzySearchEngine()] || engines.dizzy;
}

function searchWithDizzyEngine(input) {
  return search(input, getDizzySearchTemplate());
}

function search(input, template) {
  input = String(input || "").trim();
  if (!input) return template.replace("%s", "");

  // Numbers-only (e.g. "67", "12345") → always search, never treat as host/IP
  if (/^[\d\s]+$/.test(input)) {
    return template.replace("%s", encodeURIComponent(input));
  }

  // Full URL already
  try {
    var direct = new URL(input);
    // Block raw IP navigation (causes Cloudflare 1003 through the proxy)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(direct.hostname)) {
      return template.replace("%s", encodeURIComponent(input));
    }
    return direct.toString();
  } catch (err) {}

  // Domain-like without protocol: example.com
  try {
    var url = new URL("http://" + input);
    var host = url.hostname || "";
    // Require a dot and at least one letter so "67" / "1.2.3.4" don't become hosts
    if (host.includes(".") && /[a-zA-Z]/i.test(host)) {
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        return url.toString();
      }
    }
  } catch (err) {}

  // Default: search query
  return template.replace("%s", encodeURIComponent(input));
}
