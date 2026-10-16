/* Shared by the browser preview and Franklin's Node prerenderer. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("temml"));
  } else {
    root.ConcreteMath = factory(root.temml);
    root.ConcreteMath.renderMathInElement(document.body);
  }
})(typeof globalThis === "object" ? globalThis : this, function (temml) {
  // Franklin has already resolved labels and numbers each display as a unit.
  // Suppress the renderer's independent AMS numbering to keep eqrefs correct.
  function prepare(tex) {
    return tex.replace(/\\(begin|end)\{(align|alignat|gather|equation)\}/g,
      "\\$1{$2*}");
  }

  const defaults = { annotate: true, xml: true, throwOnError: true };

  function renderToString(tex, options = {}) {
    // Franklin's HTML minifier collapses Unicode whitespace between tags.
    // Numeric entities preserve explicit TeX spaces and operator spacing.
    const math = temml.renderToString(prepare(tex), { ...options, ...defaults })
      .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g,
        character => `&#${character.codePointAt(0)};`);
    const inline = `<span class="site-math">${math}</span>`;
    return options.displayMode ? `<span class="math-display">${inline}</span>` : inline;
  }

  function renderMathInElement(element) {
    temml.renderMathInElement(element, {
      ...defaults,
      fences: "(",
      preProcess: prepare,
      ignoredClasses: ["site-math"]
    });
    for (const math of element.querySelectorAll("math")) {
      if (math.closest(".site-math")) continue;
      const inline = document.createElement("span");
      inline.className = "site-math";
      math.before(inline);
      inline.append(math);
      if (math.getAttribute("display") === "block") {
        const display = document.createElement("span");
        display.className = "math-display";
        inline.before(display);
        display.append(inline);
      }
    }
  }

  return { renderToString, renderMathInElement };
});
