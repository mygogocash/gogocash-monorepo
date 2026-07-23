/** Monotonic generation token so late preview responses cannot apply after amount edits. */

export function nextCouponApplyGeneration(current: number): number {
  return current + 1;
}

export function shouldAcceptCouponPreview(
  startedGeneration: number,
  currentGeneration: number,
): boolean {
  return startedGeneration === currentGeneration;
}
