export function setupSpendCalculator(rootEl: HTMLElement): () => void {
  const spendInput = rootEl.querySelector<HTMLInputElement>("#spend-input");
  const spendSlider = rootEl.querySelector<HTMLInputElement>("#spend-slider");
  const MAX_SPEND = 200000;
  const MIN_SLIDER_SPEND = 500;
  const SLIDER_STEP = 500;
  if (spendSlider) {
    spendSlider.min = String(MIN_SLIDER_SPEND);
    spendSlider.max = String(MAX_SPEND);
    spendSlider.step = String(SLIDER_STEP);
  }
  const tiers = [
    { id: "free", mult: 1.0 },
    { id: "starter", mult: 1.2 },
  ];
  const maxMult = Math.max(...tiers.map((tier) => tier.mult));

  function updateCalc(spend: number, fromSlider: boolean) {
    spend = Math.max(0, Math.min(MAX_SPEND, spend));
    if (fromSlider) {
      spend = Math.max(MIN_SLIDER_SPEND, Math.min(MAX_SPEND, spend));
    }
    tiers.forEach((t) => {
      const pts = Math.round(spend * t.mult);
      const base = Math.round(spend * 1);
      const extra = pts - base;
      const ptsEl = rootEl.querySelector(`#pts-${t.id}`);
      const extraEl = rootEl.querySelector(`#extra-${t.id}`);
      if (ptsEl) ptsEl.textContent = `${pts.toLocaleString("en")} pts`;
      if (extraEl) extraEl.textContent = extra > 0 ? `+${extra.toLocaleString("en")} extra` : "";
    });
    const leaving = rootEl.querySelector("#leaving-behind");
    if (leaving)
      leaving.textContent = Math.round((spend * maxMult - spend) * 0.01).toLocaleString("en");
    if (spendInput) spendInput.value = Math.round(spend).toLocaleString("en");
    if (spendSlider) {
      const stepped = Math.max(
        MIN_SLIDER_SPEND,
        Math.min(MAX_SPEND, Math.round(spend / SLIDER_STEP) * SLIDER_STEP)
      );
      spendSlider.value = String(fromSlider ? spend : stepped);
    }
  }

  const onInput = (e: Event) => {
    const raw = (e.target as HTMLInputElement).value.replace(/,/g, "");
    const n = parseFloat(raw) || 0;
    updateCalc(n, false);
  };
  const onSlider = (e: Event) => {
    updateCalc(parseFloat((e.target as HTMLInputElement).value), true);
  };

  spendInput?.addEventListener("input", onInput);
  spendSlider?.addEventListener("input", onSlider);
  updateCalc(3000, false);
  return () => {
    spendInput?.removeEventListener("input", onInput);
    spendSlider?.removeEventListener("input", onSlider);
  };
}
