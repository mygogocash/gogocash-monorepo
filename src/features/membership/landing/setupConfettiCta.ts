import confetti from "canvas-confetti";
import { scrollElementIntoNearestScrollParent } from "@/lib/dom/scrollIntoScrollParent";

export function setupConfettiCta(root: HTMLElement): () => void {
  const cta = root.querySelector("#cta-confetti");
  if (!cta) return () => {};

  const colors = ["#00aa80", "#00cc99", "#c9a000", "#ffffff", "#d8f8ef"];
  const onClick = () => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 }, colors });
    window.setTimeout(() => {
      confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors });
    }, 150);
    window.setTimeout(() => {
      confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors });
    }, 300);
    window.setTimeout(() => {
      const pricing = root.querySelector("#pricing");
      if (pricing instanceof HTMLElement) {
        scrollElementIntoNearestScrollParent(pricing, { behavior: "smooth" });
      }
    }, 600);
  };
  cta.addEventListener("click", onClick);
  return () => cta.removeEventListener("click", onClick);
}
