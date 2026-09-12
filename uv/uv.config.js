(function () {
  if (typeof Ultraviolet === "undefined") return;

  // Works in both page context and SW context
  const _loc = typeof location !== "undefined" ? location : self.location;
  const _base = _loc.pathname.replace(/\/(uv\/uv\.config\.js|uv\.js)$/, "");

  self.__uv$config = {
    prefix:    _base + "/service/",
    bare:      "https://wes-prox.ksimmisk497.workers.dev/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler:   _base + "/uv/uv.handler.js",
    bundle:    _base + "/uv/uv.bundle.js",
    config:    _base + "/uv/uv.config.js",
    sw:        _base + "/uv/uv.sw.js",
  };
})();
