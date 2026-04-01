import { countUp } from "./countUp";

export function setupHeroCountUp(root: HTMLElement): () => void {
  const t1 = window.setTimeout(() => countUp(root.querySelector("#hero-pts-free"), 5300), 400);
  const t2 = window.setTimeout(() => countUp(root.querySelector("#hero-pts-starter"), 7950), 550);
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
  };
}
