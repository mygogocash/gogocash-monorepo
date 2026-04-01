import { countUp } from "./countUp";

export function setupRevealAndStats(root: HTMLElement): () => void {
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  root.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

  const statObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          const isDecimal = String(el.dataset.countTo || "").includes(".");
          const target = parseFloat(el.dataset.countTo || "0");
          countUp(el, target, 1200, isDecimal);
          statObs.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );
  root.querySelectorAll("[data-count-to]").forEach((el) => statObs.observe(el));

  return () => {
    revealObs.disconnect();
    statObs.disconnect();
  };
}
