import Lenis from "lenis";

// Inertia ("buttery") scrolling for the whole page. Skipped for people who ask their
// OS for reduced motion. Scrollable inner areas opt out with the data-lenis-prevent attribute.
let lenis = null;

export function startSmoothScroll() {
  if (lenis || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  lenis = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 0.95 });
  return () => {
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}

export function scrollToElement(element, offset = -96) {
  if (!element) return;
  if (lenis) lenis.scrollTo(element, { offset, duration: 1 });
  else element.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Freeze the page behind menus and dialogs
export function lockScroll(locked) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
