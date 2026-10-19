(() => {
  const toggle = document.getElementById("menu-toggle");
  const links = document.getElementById("site-navigation");
  if (!toggle || !links) return;
  const navigation = toggle.closest("nav");
  const header = navigation.closest("header");
  const mobile = window.matchMedia("(max-width: 500px)");

  function setOpen(open) {
    navigation.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && navigation.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
  });
  document.addEventListener("pointerdown", event => {
    if (!navigation.contains(event.target)) setOpen(false);
  });
  navigation.addEventListener("focusout", event => {
    if (event.relatedTarget && !navigation.contains(event.relatedTarget)) setOpen(false);
  });
  links.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });
  mobile.addEventListener("change", () => {
    const hadFocus = navigation.contains(document.activeElement);
    setOpen(false);
    if (hadFocus) (mobile.matches ? toggle : links.querySelector("a"))?.focus({ preventScroll: true });
  });

  header.classList.add("site-nav-ready");
})();
