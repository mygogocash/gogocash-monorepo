import { type ButtonHTMLAttributes } from "react";

const PRIMARY_BUTTON_VARIANTS = {
  /** White / outline + shadow (default). */
  default:
    "border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  /** Brand-blue filled (the website's default blue). */
  blue: "bg-brand-500 text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300",
  /** "Outline" — white fill with a 2px brand-blue border + shadow. */
  outline:
    "border-2 border-brand-500 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-brand-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
} as const;

/**
 * Primary button — fixed text size, fixed 44px height, flexible width with 16px
 * (px-4) gaps on the left and right. Defaults to a white / outline + shadow
 * look; pass `variant="blue"` for the brand-blue filled style.
 */
export default function PrimaryButton({
  className = "",
  type = "button",
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof PRIMARY_BUTTON_VARIANTS;
}) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center gap-1 rounded-lg px-4 text-sm font-medium ${PRIMARY_BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
