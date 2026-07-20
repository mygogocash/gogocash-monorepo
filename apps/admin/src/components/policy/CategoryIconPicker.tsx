"use client";

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
}: CategoryIconPickerProps) {
  const selected =
    CATEGORY_ICON_OPTIONS.find((option) => option.key === value) ??
    CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1];

  return (
    <div className="space-y-3">
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
        aria-label="Category icon"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      >
        {CATEGORY_ICON_OPTIONS.map((option) => {
          const checked = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              disabled={disabled}
              onClick={() => onChange(option.key)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
