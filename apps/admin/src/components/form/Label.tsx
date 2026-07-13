import React, { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  /**
   * Marks the field as required: renders a visible `*` (aria-hidden, so screen
   * readers don't announce the glyph) plus an sr-only "(required)" hint so the
   * requirement is conveyed to everyone.
   */
  required?: boolean;
}

const Label: FC<LabelProps> = ({ htmlFor, children, className, required }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={twMerge(
        // Default classes that apply by default
        "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400",

        // User-defined className that can override the default margin
        className,
      )}
    >
      {children}
      {required && (
        <>
          {" "}
          <span aria-hidden="true" className="text-error-500">
            *
          </span>
          <span className="sr-only">(required)</span>
        </>
      )}
    </label>
  );
};

export default Label;
