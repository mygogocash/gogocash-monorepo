/** SVG paths for How it works steps (same order EN + locale homes). */
export const HOW_IT_WORKS_ILLUSTRATION_PATHS = [
  "/images/how-it-works/browse-and-pick-your-brand.svg",
  "/images/how-it-works/shop-the-way-you-already-do.svg",
  "/images/how-it-works/cashback-after-the-merchant-confirms.svg",
] as const;

export function howItWorksIllustrationSrc(
  stepIndex: number,
): string | undefined {
  return HOW_IT_WORKS_ILLUSTRATION_PATHS[stepIndex];
}
