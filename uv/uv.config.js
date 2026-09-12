(function () {
  if (typeof Ultraviolet === "undefined") return;

  // Works on GitHub Pages project sites: /repo-name/ and at domain root
  var path = location.pathname || "/";
  var dir = path.replace(/\/[^\/]*$/, "/");
  if (dir.indexOf("/uv/") !== -1) dir = dir.replace(/\/uv\/.*$/, "/");
  if (dir.indexOf("/service/") !== -1) dir = dir.replace(/\/service\/.*$/, "/");
  var base = dir.replace(/\/$/, "");
  function join(p) { return base ? base + p : p; }

  self.__uv$config = {
    prefix: join("/service/"),
    bare: "https://spring-lab-521b.ksimmisk497.workers.dev/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: join("/uv/uv.handler.js"),
    bundle: join("/uv/uv.bundle.js"),
    config: join("/uv/uv.config.js"),
    sw: join("/uv/uv.sw.js"),
  };
  self.__wpBase = base;
})();
