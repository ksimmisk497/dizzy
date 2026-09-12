(function () {
  if (typeof Ultraviolet === "undefined") return;
  self.__uv$config = {
    prefix:    "/ultra-prox/service/",
    bare:      [
      "https://bare.dub.sh/",
      "https://bare.obfs.dev/",
      "https://uv.holyubofficial.net/",
      "https://bareserver.deno.dev/",
    ],
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler:   "/ultra-prox/uv/uv.handler.js",
    bundle:    "/ultra-prox/uv/uv.bundle.js",
    config:    "/ultra-prox/uv/uv.config.js",
    sw:        "/ultra-prox/uv/uv.sw.js",
  };
})();
