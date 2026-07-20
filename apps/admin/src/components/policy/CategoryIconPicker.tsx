"use client";

import {
  useCallback,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import CategoryIcon, {
  CATEGORY_ICON_OPTIONS,
  type CategoryIconKey,
} from "./CategoryIcon";

type CategoryIconPickerProps = {
  value: CategoryIconKey;
  onChange: (next: CategoryIconKey) => void;
  disabled?: boolean;
  /** Used only for keyword-based glyph fallback inside CategoryIcon. */
  categoryName?: string;
  /** Optional id of the visible label element (aria-labelledby). */
  labelledBy?: string;
};

/**
 * Visual built-in icon gallery for Policy Management.
 * Admins pick by seeing the glyph — not a text-only dropdown.
 */
export default function CategoryIconPicker({
  value,
  onChange,
  disabled = false,
  categoryName = "",
  labelledBy,
}: CategoryIconPickerProps) {
  const fallbackLabelId = useId();
  const labelId = labelledBy ?? fallbackLabelId;
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selected =
    CATEGORY_ICON_OPTIONS.find((option) => option.key === value) ??
    CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1];
  const selectedIndex = Math.max(
    0,
    CATEGORY_ICON_OPTIONS.findIndex((option) => option.key === value),
  );

  const focusOption = useCallback((index: number) => {
    const next = optionRefs.current[index];
    next?.focus();
  }, []);

  const moveSelection = useCallback(
    (delta: number) => {
      if (disabled) return;
      const count = CATEGORY_ICON_OPTIONS.length;
      const nextIndex = (selectedIndex + delta + count) % count;
      onChange(CATEGORY_ICON_OPTIONS[nextIndex].key);
      // Focus after state update paint.
      requestAnimationFrame(() => focusOption(nextIndex));
    },
    [disabled, focusOption, onChange, selectedIndex],
  );

  const onRadiogroupKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          moveSelection(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          moveSelection(-1);
          break;
        case "Home":
          event.preventDefault();
          onChange(CATEGORY_ICON_OPTIONS[0].key);
          requestAnimationFrame(() => focusOption(0));
          break;
        case "End":
          event.preventDefault();
          onChange(CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1].key);
          requestAnimationFrame(() =>
            focusOption(CATEGORY_ICON_OPTIONS.length - 1),
          );
          break;
        default:
          break;
      }
    },
    [disabled, focusOption, moveSelection, onChange],
  );

  return (
    <div className="space-y-3">
      {!labelledBy ? (
        <span id={fallbackLabelId} className="sr-only">
          Category icon
        </span>
      ) : null}

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-300">
          <CategoryIcon
            name={categoryName || selected.label}
            iconKey={value}
            className="h-6 w-6"
          />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Selected preview
          </span>
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">
            {selected.label}
          </span>
        </span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onRadiogroupKeyDown}
        className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4"
      >
        {CATEGORY_ICON_OPTIONS.map((option, index) => {
          const checked = option.key === value;
          return (
            <button
              key={option.key}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              tabIndex={checked ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.key)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-gray-900 ${
                checked
                  ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  checked
                    ? "bg-white text-brand-600 dark:bg-gray-900 dark:text-brand-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                <CategoryIcon
                  name={option.label}
                  iconKey={option.key}
                  className="h-4 w-4"
                />
              </span>
              <span className="truncate font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
        Choose from the built-in icon set. Preview updates as you select. Need a
        new look? Ask engineering to add a key — icons are not uploaded here.
      </p>
    </div>
  );
}
