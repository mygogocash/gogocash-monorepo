import { type ButtonHTMLAttributes } from "react";

/**
 * Text button — borderless, brand-blue text-link style. Fixed text size and a
 * fixed 36px height; width is flexible (grows with content) with 8px (px-2)
 * gaps on the left and right. Use for inline actions such as "+ Add email".
 */
export default function TextButton({
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 inline-flex h-9 items-center justify-center px-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}
