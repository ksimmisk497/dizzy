"use strict";
(function () {
  var KEY = "dizzy_theme_v1";
  var themes = [
    { id: "dizzy", label: "Dizzy (default)" },
    { id: "interstellar", label: "Interstellar style" },
    { id: "holy", label: "Holy style" },
    { id: "nebula", label: "Nebula style" },
    { id: "shadow", label: "Shadow style" }
  ];

  function load() {
    try {
      var id = localStorage.getItem(KEY) || "dizzy";
      if (!themes.some(function (t) { return t.id === id; })) id = "dizzy";
      return id;
    } catch (e) { return "dizzy"; }
  }

  function apply(id) {
    if (!themes.some(function (t) { return t.id === id; })) id = "dizzy";
    try { localStorage.setItem(KEY, id); } catch (e) {}
    document.documentElement.setAttribute("data-theme", id);
    try { document.body.setAttribute("data-theme", id); } catch (e2) {}
    return id;
  }

  function list() { return themes.slice(); }

  // Apply ASAP
  apply(load());

  window.DizzyTheme = {
    load: load,
    save: apply,
    apply: apply,
    list: list,
    current: function () {
      var id = load();
      return themes.find(function (t) { return t.id === id; }) || themes[0];
    }
  };
})();
