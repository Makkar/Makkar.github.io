(() => {
  // The layout and links are already in place in Franklin's generated HTML.
  const sidebar = document.querySelector(".otium-toc");
  const content = document.querySelector(".franklin-content");
  if (!sidebar || !content) return;
  const toggle = sidebar.querySelector(".otium-toc-toggle");
  const navigation = sidebar.querySelector("nav");

  const entries = [...navigation.querySelectorAll('a[href^="#"]')].map(link => {
    const id = decodeURIComponent(link.hash.slice(1));
    return { link, heading: document.getElementById(id) };
  }).filter(entry => entry.heading && content.contains(entry.heading));
  if (entries.length < 2) return;

  const desktop = window.matchMedia("(min-width: 1400px)");
  let active = null;
  let pendingFrame = false;

  function isOpen() {
    return sidebar.classList.contains("is-open");
  }

  function revealActiveLink() {
    if (!active || (!desktop.matches && !isOpen())) return;
    const bounds = navigation.getBoundingClientRect();
    const linkBounds = active.link.getBoundingClientRect();
    if (linkBounds.top < bounds.top) {
      navigation.scrollTop -= bounds.top - linkBounds.top;
    } else if (linkBounds.bottom > bounds.bottom) {
      navigation.scrollTop += linkBounds.bottom - bounds.bottom;
    }
  }

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    sidebar.classList.toggle("is-open", open);
    if (open) revealActiveLink();
  }

  function updateActive() {
    pendingFrame = false;
    const offset = desktop.matches ? 48 : 96;
    let current = entries[0];
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top > offset) break;
      current = entry;
    }
    // The last section may be too short to reach the top of the viewport.
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = entries.at(-1);
    }
    if (current === active) return;
    active?.link.removeAttribute("aria-current");
    active = current;
    active.link.setAttribute("aria-current", "location");
    revealActiveLink();
  }

  function scheduleUpdate() {
    if (pendingFrame) return;
    pendingFrame = true;
    window.requestAnimationFrame(updateActive);
  }

  function updateLayout() {
    const hadFocus = sidebar.contains(document.activeElement);
    setOpen(false);
    if (hadFocus) (desktop.matches ? active?.link : toggle)?.focus({ preventScroll: true });
    scheduleUpdate();
  }

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !desktop.matches && isOpen()) {
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
  });
  document.addEventListener("pointerdown", event => {
    if (!sidebar.contains(event.target)) setOpen(false);
  });
  sidebar.addEventListener("focusout", event => {
    if (event.relatedTarget && !sidebar.contains(event.relatedTarget)) setOpen(false);
  });

  for (const { link, heading } of entries) {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      setOpen(false);
      // Keep native fragment navigation and history, with keyboard focus in the post.
      if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  }

  desktop.addEventListener("change", updateLayout);
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);
  window.addEventListener("load", scheduleUpdate);
  if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(content);
  document.fonts?.ready.then(scheduleUpdate);
  updateLayout();
})();
