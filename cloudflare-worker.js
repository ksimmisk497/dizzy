export default {
  async fetch(req) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Root — bare server info endpoint UV checks
    if (url.pathname === "/" || url.pathname === "") {
      return json({
        versions: ["v1", "v2", "v3"],
        language: "NodeJS",
        memoryUsage: 0,
        maintainer: {},
        project: {}
      });
    }

    // v1 handler
    if (url.pathname.endsWith("/v1/") || url.pathname === "/v1") {
      return handleV1(req);
    }

    // v3 handler
    if (url.pathname.endsWith("/v3/") || url.pathname === "/v3") {
      return handleV3(req);
    }

    // Fallback — return bare info so UV doesn't error
    return json({
      versions: ["v1", "v2", "v3"],
      language: "NodeJS",
      memoryUsage: 0,
      maintainer: {},
      project: {}
    });
  },
};

async function handleV1(req) {
  const protocol = req.headers.get("x-bare-protocol");
  const host     = req.headers.get("x-bare-host");
  const path     = req.headers.get("x-bare-path") || "/";
  const port     = req.headers.get("x-bare-port");

  if (!host || !protocol) {
    return bareError("MISSING_BARE_HEADERS", "Missing required bare headers (x-bare-host, x-bare-protocol)");
  }

  const isDefaultPort =
    (protocol === "https:" && port === "443") ||
    (protocol === "http:"  && port === "80")  ||
    !port;

  const hostWithPort = (port && !isDefaultPort) ? `${host}:${port}` : host;
  const targetUrl    = `${protocol}//${hostWithPort}${path}`;

  return proxyFetch(req, targetUrl, hostWithPort);
}

async function handleV3(req) {
  const target = req.headers.get("x-bare-url");
  if (!target) {
    return bareError("MISSING_BARE_URL", "Missing x-bare-url header");
  }
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (_) {
    return bareError("INVALID_BARE_URL", "x-bare-url is not a valid URL: " + target);
  }
  return proxyFetch(req, targetUrl.toString(), targetUrl.host);
}

async function proxyFetch(req, targetUrl, host) {
  // Build outgoing headers from x-bare-headers
  const bareHeaders = Object.create(null);
  const headersJson = req.headers.get("x-bare-headers");
  if (headersJson) {
    try {
      Object.assign(bareHeaders, JSON.parse(headersJson));
    } catch (_) {}
  }

  // Strip headers that would conflict or get blocked
  stripForbidden(bareHeaders);

  // Required overrides
  bareHeaders["host"]            = host;
  bareHeaders["accept-encoding"] = "identity"; // disable compression — we can't re-encode

  if (!bareHeaders["user-agent"]) {
    bareHeaders["user-agent"] =
      req.headers.get("user-agent") ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  }

  const body = (req.method !== "GET" && req.method !== "HEAD") ? req.body : null;

  let targetRes;
  try {
    targetRes = await fetch(targetUrl, {
      method:   req.method,
      headers:  bareHeaders,
      body,
      redirect: "manual", // UV handles redirects itself
    });
  } catch (err) {
    return bareError("FETCH_FAILED", err.message || String(err));
  }

  // Build response headers
  const resHeaders = corsHeaders();
  const realStatus = targetRes.status;

  // UV reads the real status from x-bare-status, so we always return HTTP 200
  // to the service worker to avoid SW fetch() errors swallowing the response
  resHeaders["x-bare-status"]      = String(realStatus);
  resHeaders["x-bare-status-text"] = targetRes.statusText || "";

  // Forward all response headers back to UV via x-bare-headers
  // Skip content-encoding since we forced identity above
  const passHeaders = {};
  for (const [k, v] of targetRes.headers.entries()) {
    const lk = k.toLowerCase();
    if (lk === "content-encoding") continue;
    if (lk === "transfer-encoding") continue;
    passHeaders[k] = v;
  }
  resHeaders["x-bare-headers"] = JSON.stringify(passHeaders);

  // Forward content-type directly so the browser renders it
  const ct = targetRes.headers.get("content-type");
  if (ct) resHeaders["content-type"] = ct;

  return new Response(targetRes.body, {
    status: 200, // always 200 to SW — real status is in x-bare-status
    headers: resHeaders,
  });
}

// Returns a structured bare error UV can handle gracefully
function bareError(code, message) {
  const resHeaders = corsHeaders();
  resHeaders["x-bare-status"]      = "500";
  resHeaders["x-bare-status-text"] = "Internal Server Error";
  resHeaders["x-bare-headers"]     = JSON.stringify({ "content-type": "text/plain" });
  resHeaders["content-type"]       = "text/plain";
  // HTTP 200 to SW — UV reads x-bare-status for the real code
  return new Response(JSON.stringify({ code, id: "error", message }), {
    status: 200,
    headers: resHeaders,
  });
}

// Headers that would confuse the target server or break the proxy
function stripForbidden(headers) {
  const forbidden = new Set([
    "host", "connection", "keep-alive", "transfer-encoding",
    "te", "trailer", "upgrade",
    // UV bare request headers — must not be forwarded
    "x-bare-url", "x-bare-headers", "x-bare-forward-headers",
    "x-bare-pass-headers", "x-bare-pass-status",
    "x-bare-protocol", "x-bare-host", "x-bare-path", "x-bare-port",
    // Encoding — we force identity
    "accept-encoding",
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
