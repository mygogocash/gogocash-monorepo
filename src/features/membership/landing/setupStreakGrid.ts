import type { MembershipLandingI18n } from "./types";

export function setupStreakGrid(
  rootEl: HTMLElement,
  i18n: MembershipLandingI18n | undefined
): () => void {
  const grid = rootEl.querySelector<HTMLElement>("#streak-grid");
  const resetBtn = rootEl.querySelector("#streak-reset");
  if (!grid) return () => {};
  const gridEl = grid;

  function streakPlan(): "plus" | "pro" {
    const el = rootEl.querySelector<HTMLInputElement>('input[name="mship-streak-plan"]:checked');
    return el?.value === "pro" ? "pro" : "plus";
  }

  function render() {
    const plan = streakPlan();
    const days = plan === "pro" ? 14 : 7;
    const ptsPerDay = plan === "pro" ? 100 : 50;
    gridEl.className = days === 14 ? "sg14" : "sg7";
    gridEl.innerHTML = "";
    for (let i = 1; i <= days; i++) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "streak-day";
      tile.textContent = String(i);
      tile.addEventListener("click", function onTileClick() {
        tile.classList.toggle("completed");
        if (tile.classList.contains("completed")) {
          tile.style.animation = "none";
          void tile.offsetHeight;
          tile.style.animation = "day-pop .3s var(--ease-bounce)";
        }
        const done = gridEl.querySelectorAll(".completed").length;
        const totalEl = rootEl.querySelector("#streak-total");
        const ptsTotal = done * ptsPerDay;
        if (totalEl)
          totalEl.textContent = i18n
            ? i18n.streakFmt(done, ptsTotal)
            : `Day ${done} streak: +${ptsTotal.toLocaleString("en")} bonus pts so far`;
      });
      gridEl.appendChild(tile);
    }
    const totalEl = rootEl.querySelector("#streak-total");
    if (totalEl) totalEl.textContent = i18n?.streakZero ?? "Day 0 streak: +0 bonus pts so far";
  }

  const onRootChange = (e: Event) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.name === "mship-streak-plan" && t.type === "radio") {
      render();
    }
  };
  const onReset = (e: Event) => {
    e.preventDefault();
    render();
  };
  rootEl.addEventListener("change", onRootChange);
  resetBtn?.addEventListener("click", onReset);
  render();
  return () => {
    rootEl.removeEventListener("change", onRootChange);
    resetBtn?.removeEventListener("click", onReset);
  };
}
