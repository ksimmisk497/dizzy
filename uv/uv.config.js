(function () {
  if (typeof Ultraviolet === "undefined") return;

  var path = location.pathname || "/";
  var dir = path.replace(/\/[^\/]*$/, "/");
  if (dir.indexOf("/uv/") !== -1) dir = dir.replace(/\/uv\/.*$/, "/");
  if (dir.indexOf("/service/") !== -1) dir = dir.replace(/\/service\/.*$/, "/");
  var base = dir.replace(/\/$/, "");
  function join(p) { return base ? base + p : p; }

  // Fast public bare servers — UV picks the first one that responds
  // Ordered by typical latency; failover is automatic inside uv.sw.js
  var bareServers = [
    "https://wes-prox.ksimmisk497.workers.dev/",
    "https://uv.holyubofficial.net/",
    "https://bare.operand.org/",
    "https://bareserver.r58playz.dev/"
  ];

  self.__uv$config = {
    prefix: join("/service/"),
    bare: bareServers[0],       // primary — SW cycles through array on failure
    bareServers: bareServers,   // full list for failover logic in sw
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: join("/uv/uv.handler.js"),
    bundle:  join("/uv/uv.bundle.js"),
    config:  join("/uv/uv.config.js"),
    sw:      join("/uv/uv.sw.js"),
  };
  self.__wpBase = base;
})();
