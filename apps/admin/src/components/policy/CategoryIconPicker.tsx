"use client";

import {
  useCallback,
  useId,
  useRef,
  type ChangeEvent,
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
  /** Existing persisted custom icon URL (category.image). */
  customIconUrl?: string | null;
  /** Local draft custom icon file preview URL. */
  customIconPreviewUrl?: string | null;
  customIconFileName?: string | null;
  onCustomIconChange?: (file: File | null) => void;
};

/**
 * Visual built-in icon gallery for Policy Management.
 * Optional custom image upload overrides the glyph in customer lists when set.
 */
export default function CategoryIconPicker({
  value,
  onChange,
  disabled = false,
  categoryName = "",
  labelledBy,
  customIconUrl = null,
  customIconPreviewUrl = null,
  customIconFileName = null,
  onCustomIconChange,
}: CategoryIconPickerProps) {
  const fallbackLabelId = useId();
  const labelId = labelledBy ?? fallbackLabelId;
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selected =
    CATEGORY_ICON_OPTIONS.find((option) => option.key === value) ??
    CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1];
  const selectedIndex = Math.max(
    0,
    CATEGORY_ICON_OPTIONS.findIndex((option) => option.key === value),
  );
  const previewCustomSrc = customIconPreviewUrl || customIconUrl || null;

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

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onCustomIconChange?.(file);
  };

  const clearCustomIcon = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    onCustomIconChange?.(null);
  };

  return (
    <div className="space-y-3">
      {!labelledBy ? (
        <span id={fallbackLabelId} className="sr-only">
          Category icon
        </span>
      ) : null}

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
        <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-300">
          {previewCustomSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewCustomSrc}
              alt=""
              className="h-10 w-10 object-cover"
            />
          ) : (
            <CategoryIcon
              name={categoryName || selected.label}
              iconKey={value}
              className="h-6 w-6"
            />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Selected preview
          </span>
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">
            {previewCustomSrc
              ? customIconFileName || "Custom image"
              : selected.label}
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
          const checked = option.key === value && !previewCustomSrc;
          // Keep a single tab stop even when a custom image overrides the glyph.
          const focusable = option.key === value;
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
              tabIndex={focusable ? 0 : -1}
              disabled={disabled}
              onClick={() => {
                clearCustomIcon();
                onChange(option.key);
              }}
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

      {onCustomIconChange ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 dark:border-gray-600 dark:bg-gray-900/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                Custom icon image (optional)
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                Square PNG/JPG overrides the built-in glyph in customer category
                lists. Built-in key is still saved as fallback.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor={fileInputId}
                className={`inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${
                  disabled ? "pointer-events-none opacity-50" : ""
                }`}
              >
                {previewCustomSrc ? "Replace image" : "Upload image"}
              </label>
              <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-label="Custom category icon file"
                disabled={disabled}
                className="sr-only"
                onChange={onFileChange}
              />
              {customIconPreviewUrl ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={clearCustomIcon}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear upload
                </button>
              ) : null}
            </div>
          </div>
          {customIconFileName ? (
            <p className="mt-2 truncate text-[11px] text-gray-600 dark:text-gray-300">
              {customIconFileName}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
        Choose a built-in icon or upload a custom image. Preview updates as you
        select. Custom images are saved with the category on Save changes.
      </p>
    </div>
  );
}
