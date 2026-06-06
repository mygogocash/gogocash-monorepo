/** Clamp a requested page number to a valid [1, totalPages] integer. */
export function clampPage(value: number, totalPages: number): number {
  const max = Math.max(1, Math.floor(totalPages) || 1);
  if (Number.isNaN(value)) return 1;
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, 1), max);
}
