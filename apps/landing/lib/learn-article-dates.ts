/** Best-effort ISO date (YYYY-MM-DD) for Article / Open Graph from display strings like "March 22, 2026". */
export function learnArticleDateIso(display: string): string | undefined {
  const t = Date.parse(display);
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString().slice(0, 10);
}
