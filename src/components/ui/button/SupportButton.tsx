import Link from "next/link";
import { type ComponentProps } from "react";

/**
 * Shared visual for the Support button — compact outline, fixed 28px height,
 * text-xs, white fill, flexible width with 12px (px-3) side gaps. Exported so
 * stateful `<button>`s (e.g. pagination Previous/Next) can wear the same look
 * while keeping native button semantics (onClick / disabled).
 */
export const SUPPORT_BUTTON_CLASS =
  "inline-flex h-7 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800";

/**
 * Support button — compact outline style (text-xs) rendered as a Next Link for
 * navigation actions such as table-row "View". Fixed text size and a fixed 28px
 * height; width is flexible (grows with content) with 12px (px-3) gaps on the
 * left and right.
 */
export default function SupportButton({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return <Link className={`${SUPPORT_BUTTON_CLASS} ${className}`} {...props} />;
}
