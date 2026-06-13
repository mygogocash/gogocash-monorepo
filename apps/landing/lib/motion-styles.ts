/**
 * Tailwind class stacks aligned with `tailwind.config.ts` motion tokens.
 * Pair with `motion-reduce:*` on the same element where transforms are used.
 */

export const twDurMicro = "duration-micro";
export const twDurButton = "duration-button";
export const twDurSection = "duration-section";

export const twEaseStandard = "ease-standard";
export const twEaseEmphasized = "ease-emphasized";

/** Typical interactive surfaces: color, border, shadow, light transform */
export const twTransitionButton =
  `${twDurButton} ${twEaseStandard} transition-[background-color,border-color,color,box-shadow,transform,opacity] motion-reduce:transition-colors motion-reduce:duration-micro`;

export const twPressSm =
  "active:scale-[0.98] motion-reduce:active:scale-100";

/** Icon / compact controls — softer press + no 300ms tap delay on touch */
export const twIconButtonMotion = `${twDurButton} ${twEaseEmphasized} transition-[background-color,color,transform,opacity] motion-reduce:transition-colors motion-reduce:duration-micro touch-manipulation select-none active:scale-[0.96] motion-reduce:active:scale-100`;

/** Subtle hover lift for primary CTAs */
export const twHoverLiftMd =
  "hover:scale-[1.03] motion-reduce:hover:scale-100";

/** Stronger hero / header CTA hover (matches prior 1.05) */
export const twHoverLiftLg =
  "hover:scale-105 motion-reduce:hover:scale-100";

export const twFocusRingPrimary =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const twFocusRingGray =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400";

/** Filled primary CTA — add colors, padding, radius in caller */
export const twCtaPrimaryMotion = `${twTransitionButton} ${twPressSm} ${twHoverLiftLg} ${twFocusRingPrimary}`;

/** Outline / secondary CTA */
export const twCtaOutlineMotion = `${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`;

/** Muted outline (gray focus ring) */
export const twCtaMutedOutlineMotion = `${twTransitionButton} ${twPressSm} ${twFocusRingGray}`;

/** Nav / footer text links */
export const twNavTextMotion = `${twDurButton} ${twEaseStandard} transition-colors motion-reduce:duration-micro`;

/** Opacity hover (logo, icons) */
export const twOpacityHoverMotion = `${twDurButton} ${twEaseStandard} transition-opacity motion-reduce:duration-micro`;
