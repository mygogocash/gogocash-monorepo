/**
 * Shared Tailwind class stacks for CTAs and section typography.
 * Compose with `motion-styles` (e.g. twCtaPrimaryMotion, twCtaOutlineMotion).
 */

/** Standard filled primary CTA (pill, green, normal weight). */
export const uiCtaPrimarySurface =
  "rounded-full bg-primary font-normal text-white shadow-lg hover:bg-primary-dark hover:shadow-xl";

/** Hero-style primary CTA with xl radius (locale / id / partner LPs). */
export const uiCtaPrimarySurfaceRoundedXl =
  "rounded-xl bg-primary font-normal text-white shadow-md hover:bg-primary-dark";

/** Outline CTA with brand green border. */
export const uiCtaOutlineBrand =
  "rounded-full border-2 border-primary bg-white font-normal text-primary hover:bg-surface-green";

/** White pill on gradient / dark panels. */
export const uiCtaInvertedOnGradient =
  "rounded-full bg-white font-normal text-primary shadow-sm hover:shadow-lg";

/** Inline “Read more” / hub card affordance. */
export const uiLinkCta = "font-normal text-primary";

/** Default in-page section H2. */
export const uiSectionTitle = "text-3xl font-bold text-gray-800 md:text-4xl";

/** Section H2 with large desktop step. */
export const uiSectionTitleLg =
  "text-3xl font-bold text-gray-800 md:text-4xl lg:text-5xl";

/** Narrower sections (e.g. Learn teaser). */
export const uiSectionTitleCompact =
  "text-2xl font-bold text-gray-800 md:text-3xl";

/** How-it-works block title (tighter tracking, custom lg size). */
export const uiSectionTitleHowItWorks =
  "text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-[2.75rem] lg:leading-tight";

/** Card / teaser headline. */
export const uiCardTitle = "text-lg font-semibold text-gray-800";
