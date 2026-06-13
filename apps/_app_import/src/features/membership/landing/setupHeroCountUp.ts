import { countUp } from "./countUp";

function setHeroPtsInstant(el: Element | null, value: number) {
  if (!el || !(el instanceof HTMLElement)) return;
  const suffix = el.dataset.suffix || "";
  el.textContent = Math.round(value).toLocaleString("en") + suffix;
}

/** Run hero points count-up once when the hero section is first seen (same pattern as `[data-count-to]` stats). */
export function setupHeroCountUp(root: HTMLElement): () => void {
  const section = root.querySelector<HTMLElement>(".hero-section");
  if (!section) return () => {};

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    setHeroPtsInstant(root.querySelector("#hero-pts-free"), 5300);
    setHeroPtsInstant(root.querySelector("#hero-pts-starter"), 7950);
    return () => {};
  }

  let done = false;
  const obs = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting || done) return;
      done = true;
      obs.disconnect();
      window.setTimeout(() => countUp(root.querySelector("#hero-pts-free"), 5300), 400);
      window.setTimeout(() => countUp(root.querySelector("#hero-pts-starter"), 7950), 550);
    },
    { threshold: 0.2 }
  );
  obs.observe(section);
  return () => obs.disconnect();
}
