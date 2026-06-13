"use client";
import React, { useState } from "react";

interface SwitchProps {
  label: string;
  ariaLabel?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray"; // Added prop to toggle color theme
  /** Classes applied to the label text while checked (e.g. "text-brand-500"). */
  activeLabelClassName?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  ariaLabel,
  checked,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue", // Default to blue color
  activeLabelClassName,
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    if (!isControlled) {
      setInternalChecked(newCheckedState);
    }
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked
            ? "bg-brand-500 "
            : "bg-gray-200 dark:bg-white/10", // Blue version
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        }
      : {
          background: isChecked
            ? "bg-gray-800 dark:bg-white/10"
            : "bg-gray-200 dark:bg-white/10", // Gray version
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        };

  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled
          ? "text-gray-400"
          : isChecked && activeLabelClassName
            ? activeLabelClassName
            : "text-gray-700 dark:text-gray-400"
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={ariaLabel || label || undefined}
        disabled={disabled}
        onClick={handleToggle}
        className="relative shrink-0 border-0 bg-transparent p-0"
      >
        <div
          className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
            disabled
              ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
              : switchColors.background
          }`}
        ></div>
        <div
          className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${switchColors.knob}`}
        ></div>
      </button>
      {label ? <span onClick={handleToggle}>{label}</span> : null}
    </label>
  );
};

export default Switch;
