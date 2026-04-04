export function setupSpendCalculator(rootEl: HTMLElement): () => void {
  const spendInput = rootEl.querySelector<HTMLInputElement>("#spend-input");
  const spendSlider = rootEl.querySelector<HTMLInputElement>("#spend-slider");
  const tiers = [
    { id: "free", mult: 1.0 },
    { id: "starter", mult: 1.5 },
  ];
  const maxMult = Math.max(...tiers.map((tier) => tier.mult));

  function updateCalc(spend: number, fromSlider: boolean) {
    spend = Math.max(0, spend);
    if (fromSlider) {
      spend = Math.max(500, Math.min(50000, spend));
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
      const stepped = Math.max(500, Math.min(50000, Math.round(spend / 500) * 500));
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
