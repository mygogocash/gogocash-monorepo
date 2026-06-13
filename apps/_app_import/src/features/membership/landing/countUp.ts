export function countUp(
  el: HTMLElement | null,
  target: number,
  duration = 1200,
  isDecimal = false
) {
  if (!el) return;
  const suffix = el.dataset.suffix || "";
  const start = performance.now();
  const tick = (time: number) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = eased * target;
    el.textContent = (isDecimal ? val.toFixed(1) : Math.round(val).toLocaleString("en")) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
