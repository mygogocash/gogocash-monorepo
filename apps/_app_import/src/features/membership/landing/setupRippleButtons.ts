export function setupRippleButtons(root: HTMLElement): () => void {
  const buttons = root.querySelectorAll<HTMLElement>(".btn-ripple");
  const cleanups: (() => void)[] = [];

  buttons.forEach((btn) => {
    const onClick = (e: MouseEvent) => {
      const circle = document.createElement("span");
      const d = Math.max(btn.clientWidth, btn.clientHeight);
      const rect = btn.getBoundingClientRect();
      circle.className = "ripple";
      circle.style.width = circle.style.height = `${d}px`;
      circle.style.left = `${e.clientX - rect.left - d / 2}px`;
      circle.style.top = `${e.clientY - rect.top - d / 2}px`;
      btn.querySelector(".ripple")?.remove();
      btn.appendChild(circle);
    };
    btn.addEventListener("click", onClick);
    cleanups.push(() => btn.removeEventListener("click", onClick));
  });

  return () => cleanups.forEach((fn) => fn());
}
