export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/" || url.pathname === "") {
      return json({ versions: ["v1", "v2", "v3"], language: "NodeJS", memoryUsage: 0, maintainer: {}, project: {} });
    }

    if (url.pathname.endsWith("/v1/") || url.pathname === "/v1") return handleV1(req);
    if (url.pathname.endsWith("/v3/") || url.pathname === "/v3") return handleV3(req);

    return json({ versions: ["v1", "v2", "v3"], language: "NodeJS", memoryUsage: 0, maintainer: {}, project: {} });
  },
};

async function handleV1(req) {
  const protocol = req.headers.get("x-bare-protocol");
  const host     = req.headers.get("x-bare-host");
  const path     = req.headers.get("x-bare-path") || "/";
  const port     = req.headers.get("x-bare-port");

  if (!host || !protocol) return bareError("MISSING_BARE_HEADERS", "Missing x-bare-host or x-bare-protocol");

  const isDefaultPort =
    (protocol === "https:" && (port === "443" || !port)) ||
    (protocol === "http:"  && (port === "80"  || !port));

  const hostWithPort = (port && !isDefaultPort) ? `${host}:${port}` : host;
  const targetUrl    = `${protocol}//${hostWithPort}${path}`;

  return proxyFetch(req, targetUrl, hostWithPort);
}

async function handleV3(req) {
  const target = req.headers.get("x-bare-url");
  if (!target) return bareError("MISSING_BARE_URL", "Missing x-bare-url");
  let targetUrl;
  try { targetUrl = new URL(target); }
  catch (_) { return bareError("INVALID_BARE_URL", "Bad URL: " + target); }
  return proxyFetch(req, targetUrl.toString(), targetUrl.host);
}

async function proxyFetch(req, targetUrl, host) {
  const bareHeaders = Object.create(null);
  const headersJson = req.headers.get("x-bare-headers");
  if (headersJson) {
    try { Object.assign(bareHeaders, JSON.parse(headersJson)); } catch (_) {}
  }

  stripForbidden(bareHeaders);
  
  bareHeaders["host"] = host;

  // Helpful defaults for media sites (TikTok, etc.)
  const hostLower = String(host || "").toLowerCase();
  const isMediaHost = /tiktok|bytedance|byteoversea|ibytedtos|musical\.ly|ytimg|googlevideo|vimeo|twimg|brave/.test(hostLower);
  if (isMediaHost) {
    if (!bareHeaders["referer"]) {
      if (hostLower.includes("tiktok") || hostLower.includes("byte")) {
        bareHeaders["referer"] = "https://www.tiktok.com/";
        bareHeaders["origin"] = "https://www.tiktok.com";
      }
    }
    // UA applied later (mobile-friendly)
    // Prefer identity so media bytes are not mangled unless range needs otherwise
    if (!bareHeaders["range"]) {
      bareHeaders["accept-encoding"] = "identity";
    }
  }


  // ── Range request passthrough for video seeking ──────────────────────────
  // UV puts the Range header inside x-bare-headers. If it's there, keep it.
  // Also check the raw request headers in case it was passed directly.
  const rangeFromRaw = req.headers.get("range");
  if (rangeFromRaw && !bareHeaders["range"]) {
    bareHeaders["range"] = rangeFromRaw;
  }

  // Only disable compression when NOT a range/video request — range responses
  // must not be re-encoded or the byte offsets will be wrong
  const isRangeReq = !!bareHeaders["range"];
  if (!isRangeReq) {
    bareHeaders["accept-encoding"] = "identity";
  } else {
    // For range requests, allow the server to respond naturally
    delete bareHeaders["accept-encoding"];
  }

  // Prefer Dizzy-selected UA (x-dizzy-ua), then bare headers, then Chrome Mobile
  const dizzyUa = req.headers.get("x-dizzy-ua");
  const fixedChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const tiktokUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  // Locked to Chrome — not changeable
  bareHeaders["user-agent"] = fixedChrome;

  if (/brave\.com|search\.brave/.test(hostLower)) {
    bareHeaders["user-agent"] = bareHeaders["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    bareHeaders["referer"] = bareHeaders["referer"] || "https://search.brave.com/";
    bareHeaders["origin"] = bareHeaders["origin"] || "https://search.brave.com";
    bareHeaders["accept"] = bareHeaders["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    bareHeaders["accept-language"] = bareHeaders["accept-language"] || "en-US,en;q=0.9";
  }


  // Strip client hints that expose real browser
  delete bareHeaders["sec-ch-ua"];
  delete bareHeaders["sec-ch-ua-full-version-list"];
  delete bareHeaders["sec-ch-ua-platform"];
  delete bareHeaders["sec-ch-ua-platform-version"];
  delete bareHeaders["sec-ch-ua-model"];
  delete bareHeaders["sec-ch-ua-mobile"];

  // TikTok / ByteDance always get a mobile Chrome/iOS UA (desktop often fails)
  if (/tiktok|bytedance|byteoversea|ibytedtos|musical\.ly|ttlivecdn|tiktokv/.test(hostLower)) {
    bareHeaders["user-agent"] = fixedChrome;
    bareHeaders["referer"] = bareHeaders["referer"] || "https://www.tiktok.com/";
    bareHeaders["origin"] = bareHeaders["origin"] || "https://www.tiktok.com";
    bareHeaders["sec-ch-ua-mobile"] = "?1";
    bareHeaders["sec-fetch-site"] = bareHeaders["sec-fetch-site"] || "same-origin";
    bareHeaders["sec-fetch-mode"] = bareHeaders["sec-fetch-mode"] || "navigate";
    bareHeaders["sec-fetch-dest"] = bareHeaders["sec-fetch-dest"] || "document";
  }

  const body = (req.method !== "GET" && req.method !== "HEAD") ? req.body : null;

  let targetRes;
  try {
    targetRes = await fetch(targetUrl, {
      method:   req.method,
      headers:  bareHeaders,
      body,
      redirect: "manual",
    });
  } catch (err) {
    return bareError("FETCH_FAILED", err.message || String(err));
  }

  const resHeaders = corsHeaders();
  const realStatus = targetRes.status;

  resHeaders["x-bare-status"]      = String(realStatus);
  resHeaders["x-bare-status-text"] = targetRes.statusText || "";

  // ── Forward ALL response headers — critical for video ────────────────────
  // content-range, accept-ranges, content-length MUST reach the video player
  const passHeaders = {};
  for (const [k, v] of targetRes.headers.entries()) {
    const lk = k.toLowerCase();
    // Only skip content-encoding when not a range response
    // (206 responses are already in the correct byte range — don't strip encoding)
    if (lk === "content-encoding" && realStatus !== 206) continue;
    if (lk === "transfer-encoding") continue;
    passHeaders[k] = v;
  }
  resHeaders["x-bare-headers"] = JSON.stringify(passHeaders);

  const ct = targetRes.headers.get("content-type");
  if (ct) resHeaders["content-type"] = ct;

  // ── For 206 Partial Content, preserve content-range on the outer response
  // so the browser's media player knows the byte range it received ──────────
  const contentRange = targetRes.headers.get("content-range");
  if (contentRange) {
    resHeaders["content-range"] = contentRange;
    resHeaders["accept-ranges"]  = "bytes";
  }

  const acceptRanges = targetRes.headers.get("accept-ranges");
  if (acceptRanges) resHeaders["accept-ranges"] = acceptRanges;

  // ── Content-Length must pass through for video buffering ─────────────────
  const contentLength = targetRes.headers.get("content-length");
  if (contentLength) resHeaders["content-length"] = contentLength;

  // Always return 200 to the SW — UV reads real status from x-bare-status.
  // Exception: 206 must stay 206 so the browser media element gets partial content
  const swStatus = realStatus === 206 ? 206 : 200;

  return new Response(targetRes.body, { status: swStatus, headers: resHeaders });
}

function bareError(code, message) {
  const resHeaders = corsHeaders();
  resHeaders["x-bare-status"]      = "500";
  resHeaders["x-bare-status-text"] = "Internal Server Error";
  resHeaders["x-bare-headers"]     = JSON.stringify({ "content-type": "application/json" });
  resHeaders["content-type"]       = "application/json";
  return new Response(JSON.stringify({ code, id: "error", message }), {
    status: 200,
    headers: resHeaders,
  });
}

function stripForbidden(headers) {
  const forbidden = new Set([
    "host", "connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade",
    "x-bare-url", "x-bare-headers", "x-bare-forward-headers",
    "x-bare-pass-headers", "x-bare-pass-status",
    "x-bare-protocol", "x-bare-host", "x-bare-path", "x-bare-port",
  ]);
  for (const k of Object.keys(headers)) {
    if (forbidden.has(k.toLowerCase())) delete headers[k];
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin":   "*",
    "access-control-allow-headers":  "*",
    "access-control-allow-methods":  "*",
    "access-control-expose-headers": "*",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}
