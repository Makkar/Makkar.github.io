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

  // Firefox's operator dictionary gives prefix ⊗ largeop/movablelimits defaults.
  // Temml emits that form inside accents, so an inline hat moves to the side
  // like a sum's upper limit. Specify the small tensor operator's defaults;
  // the distinct bigotimes glyph (⨂) and explicit attributes keep their behavior.
  const tensorDefaults = ["movablelimits", "largeop"];
  const accentSpacing = ["lspace", "rspace"];

  function addDefaults(attributes, names, value) {
    for (const name of names) {
      if (!new RegExp(`\\s${name}=`).test(attributes)) {
        attributes += ` ${name}="${value}"`;
      }
    }
    return attributes;
  }

  function normalizeOperators(markup) {
    return markup
      .replace(/<mo\b([^>]*)>⊗<\/mo>/g, (_, attributes) =>
        `<mo${addDefaults(attributes, tensorDefaults, "false")}>⊗</mo>`)
      // WebKit includes default operator spacing inside an accent's base,
      // widening the hat and detaching scripts. A TeX accent has an unspaced base.
      .replace(/(<mover\b[^>]*><mo\b)([^>]*)(>⊗<\/mo>)/g,
        (_, start, attributes, end) =>
          start + addDefaults(attributes, accentSpacing, "0em") + end)
      // Identify the non-stretching tilde for Concrete's WebKit accent correction.
      .replace(/(<mo\b[^>]*)(>~<\/mo><\/mover>)/g,
        '$1 data-site-tilde="true"$2');
  }

  function renderToString(tex, options = {}) {
    // Franklin's HTML minifier collapses Unicode whitespace between tags.
    // Numeric entities preserve explicit TeX spaces and operator spacing.
    const math = normalizeOperators(temml.renderToString(prepare(tex), { ...options, ...defaults }))
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
      // Auto-render creates DOM nodes directly instead of calling renderToString.
      for (const operator of math.querySelectorAll("mo")) {
        if (operator.textContent !== "⊗") continue;
        for (const name of tensorDefaults) {
          if (!operator.hasAttribute(name)) operator.setAttribute(name, "false");
        }
        if (operator.parentElement.localName === "mover" &&
            operator.parentElement.firstElementChild === operator) {
          for (const name of accentSpacing) {
            if (!operator.hasAttribute(name)) operator.setAttribute(name, "0em");
          }
        }
      }
      for (const accent of math.querySelectorAll("mover > mo:last-child")) {
        if (accent.textContent === "~") accent.setAttribute("data-site-tilde", "true");
      }
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
