// A finely sampled planar Brownian motion, killed at the rectangle's boundary.
// Keeping the sampler independent of the browser lets us check its statistics
// and verify that frame size cannot change the sampled path.
export const WIDTH = 1000;
export const HEIGHT = 500;
export const STEP_SIGMA = 0.25;
const STEPS_PER_SECOND = 24000;

export function seededRandom(seed) {
  // Mulberry32: deterministic uniform samples for a single, freshly seeded path.
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export class BrownianMotion {
  constructor({ seed, width = WIDTH, height = HEIGHT, sigma = STEP_SIGMA }) {
    this.width = width;
    this.height = height;
    this.sigma = sigma;
    this.x = width / 2;
    this.y = height / 2;
    this.steps = 0;
    this.stopped = false;
    this.random = seededRandom(seed);
  }

  advance(count, visit = () => {}) {
    for (let i = 0; i < count && !this.stopped; i++) {
      // Box–Muller gives independent Gaussian increments in the two axes.
      const radius = this.sigma * Math.sqrt(-2 * Math.log(1 - this.random()));
      const angle = 2 * Math.PI * this.random();
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);
      const nextX = this.x + dx;
      const nextY = this.y + dy;

      // Clip the final tiny segment at its FIRST edge intersection. Clamping
      // both coordinates independently would move the endpoint off that segment.
      let tx = Infinity;
      let ty = Infinity;
      if (nextX <= 0) tx = -this.x / dx;
      else if (nextX >= this.width) tx = (this.width - this.x) / dx;
      if (nextY <= 0) ty = -this.y / dy;
      else if (nextY >= this.height) ty = (this.height - this.y) / dy;
      const hit = Math.min(tx, ty);
      if (hit <= 1) {
        this.x += hit * dx;
        this.y += hit * dy;
        if (tx <= ty) this.x = dx < 0 ? 0 : this.width;
        if (ty <= tx) this.y = dy < 0 ? 0 : this.height;
        this.stopped = true;
      } else {
        this.x = nextX;
        this.y = nextY;
      }
      this.steps++;
      visit(this.x, this.y);
    }
  }
}

function freshSeed() {
  // Time distinguishes page loads; browser entropy also distinguishes tabs
  // opened in the same millisecond. No seed or path is persisted.
  const entropy = new Uint32Array(1);
  globalThis.crypto?.getRandomValues(entropy);
  return (entropy[0] ^ Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
}

function initializeBanner(banner) {
  const canvas = banner.querySelector(".brownian-canvas");
  const context = canvas.getContext("2d");
  if (!context) return; // The original image remains usable without canvas.
  const tip = banner.querySelector(".brownian-tip");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const seed = freshSeed();
  const motion = new BrownianMotion({ seed });
  banner.dataset.seed = String(seed);

  // A fixed 4× backing store keeps the path sharp on high-density screens. CSS
  // scales it responsively; resizing never clears, stretches the model, or
  // resamples the path. Only the newest segments are painted each frame.
  context.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  context.strokeStyle = getComputedStyle(banner).getPropertyValue("--text-color").trim() || "#2c2d30";
  context.lineWidth = 0.55;
  context.lineCap = "round";
  context.lineJoin = "round";

  const staticSample = preference.matches;
  let visible = !("IntersectionObserver" in window);
  let frame = null;
  let lastTime = null;
  let pendingSteps = 0;

  function positionTip() {
    tip.style.left = `${100 * motion.x / WIDTH}%`;
    tip.style.top = `${100 * motion.y / HEIGHT}%`;
  }

  function reveal() {
    banner.classList.add("is-ready");
    positionTip();
  }

  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    if (!motion.stopped && visible && !document.hidden &&
        (staticSample || !preference.matches)) {
      frame = requestAnimationFrame(draw);
    }
  }

  function draw(time) {
    frame = null;
    // Cap recovery after an unusually slow frame. Hidden/offscreen time is
    // discarded by sync(), so returning to the page cannot jump the path.
    const elapsed = lastTime === null ? 0 : Math.min(50, time - lastTime);
    lastTime = time;
    pendingSteps += elapsed * STEPS_PER_SECOND / 1000;
    const count = staticSample ? 16000 : Math.floor(pendingSteps);
    if (!staticSample) pendingSteps -= count;
    context.beginPath();
    context.moveTo(motion.x, motion.y);
    motion.advance(count, (x, y) => context.lineTo(x, y));
    context.stroke();
    positionTip();

    if (motion.stopped) {
      reveal();
      canvas.setAttribute("aria-label", "A completed two-dimensional Brownian path from the center to its first contact with the rectangle's edge.");
      return;
    }
    frame = requestAnimationFrame(draw);
  }

  preference.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
  });
  window.addEventListener("pageshow", sync);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(banner);
  }

  // With reduced motion, build the new sample in bounded chunks behind the
  // original image, then reveal it once, complete and still.
  if (!staticSample) reveal();
  sync();
}

if (typeof document !== "undefined") {
  const banner = document.querySelector("[data-brownian-banner]");
  if (banner) initializeBanner(banner);
}
