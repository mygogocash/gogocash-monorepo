import { type ButtonHTMLAttributes } from "react";

const SECONDARY_BUTTON_VARIANTS = {
  /** White / outline + subtle shadow (default). */
  default:
    "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
  /** Brand-blue filled (the website's default blue). */
  blue: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300",
} as const;

/**
 * Secondary button — fixed text size, fixed 36px height, flexible width with
 * 12px (px-3) gaps on the left and right, and a subtle shadow. Defaults to a
 * white / outline look; pass `variant="blue"` for the brand-blue filled style.
 * Use for secondary actions such as "Edit user".
 */
export default function SecondaryButton({
  className = "",
  type = "button",
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof SECONDARY_BUTTON_VARIANTS;
}) {
  return (
    <button
      type={type}
      className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed ${SECONDARY_BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
