// Scroll helpers: smooth section navigation and language-switch scroll anchoring.
import { prefersReducedMotion } from './env.js';

/** Order matters: first match wins. `home` includes the reserved scroll area below the hero. */
export const SECTION_IDS = ['home', 'scroll-space', 'about', 'collections', 'contact', 'footer'];

const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

/** Which section is under the top edge of the viewport, and how far into it we are (0..1). */
export function captureScrollAnchor() {
  const y = window.scrollY;
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const top = docTop(el);
    const h = el.offsetHeight;
    if (y >= top - 1 && y < top + h - 1) return { id, frac: h > 0 ? (y - top) / h : 0, y };
  }
  return { id: null, frac: 0, y };
}

/** Put the same part of the same section back under the top edge after the layout changed. */
export function restoreScrollAnchor(anchor) {
  if (!anchor) return;
  if (!anchor.id) {
    window.scrollTo(0, anchor.y);
    return;
  }
  const el = document.getElementById(anchor.id);
  if (!el) return;
  const y = docTop(el) + anchor.frac * el.offsetHeight;
  window.scrollTo(0, Math.max(0, Math.round(y)));
}

export function sectionTop(id) {
  if (id === 'home') return 0;
  const el = document.getElementById(id);
  return el ? Math.max(0, Math.round(docTop(el))) : 0;
}

// ── Programmatic smooth scrolling ───────────────────────────────────────────────────────────────────────────────
// Driven by the wall clock, not by the number of frames: on a slow device (or while the 3D scene is busy) the
// scroll still arrives on time instead of crawling. Any wheel / touch / key input from the visitor cancels it.
let activeScroll = null;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function cancelActiveScroll() {
  if (!activeScroll) return;
  cancelAnimationFrame(activeScroll.raf);
  activeScroll.detach();
  activeScroll = null;
}

/**
 * Scroll to `target` (a number, or a function returning the current target so late layout changes are followed).
 * Returns nothing; call again to retarget. Instant when the visitor prefers reduced motion.
 */
function animateScrollTo(target, { duration, instant = false } = {}) {
  cancelActiveScroll();
  const resolve = typeof target === 'function' ? target : () => target;
  if (instant || prefersReducedMotion()) {
    window.scrollTo(0, resolve());
    return;
  }
  const from = window.scrollY;
  const total = Math.abs(resolve() - from);
  const ms = (duration ?? Math.min(2.2, Math.max(0.7, total / 3200))) * 1000;
  const startedAt = performance.now();
  const state = { raf: 0, detach: () => {} };
  const cancel = () => cancelActiveScroll();
  const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  events.forEach((e) => window.addEventListener(e, cancel, { passive: true, once: true }));
  state.detach = () => events.forEach((e) => window.removeEventListener(e, cancel));
  const step = (now) => {
    const p = Math.min(1, (now - startedAt) / ms);
    const to = resolve();
    window.scrollTo(0, from + (to - from) * easeInOutCubic(p));
    if (p < 1) {
      state.raf = requestAnimationFrame(step);
    } else {
      window.scrollTo(0, resolve()); // land exactly, even if the layout moved meanwhile
      state.detach();
      if (activeScroll === state) activeScroll = null;
    }
  };
  activeScroll = state;
  state.raf = requestAnimationFrame(step);
}

/** Smoothly scroll to a section (instantly when the visitor prefers reduced motion). */
export function scrollToSection(id, { instant = false, updateHash = true } = {}) {
  animateScrollTo(() => sectionTop(id), { instant });
  if (updateHash) {
    try {
      const url = id === 'home' ? location.pathname + location.search : `${location.pathname}${location.search}#${id}`;
      history.replaceState(null, '', url);
    } catch {
      /* ignore */
    }
  }
}

/** Scroll to a document Y position (used by the story chapter navigation). */
export function scrollToY(y) {
  animateScrollTo(y, { duration: Math.min(2.4, Math.max(0.8, Math.abs(y - window.scrollY) / 3000)) });
}
