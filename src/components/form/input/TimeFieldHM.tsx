"use client";

import { useEffect, useRef, useState } from "react";
import {
  clampHour,
  clampMinute,
  joinHHMM,
  padTimePart,
  splitHHMM,
} from "@/lib/time24";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

interface TimeFieldHMProps {
  /** Stored value as `HH:MM` (or partial / empty). */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Used to label the hour / minute inputs for screen readers. */
  ariaLabel?: string;
  className?: string;
}

/**
 * 24-hour time entry as two blanks — `[HH] : [MM]` — each typeable and each
 * opening a scrollable number popup (00–23 / 00–59) on focus. Native
 * `<input type=time>` can't be forced to 24h across browsers, so we drive
 * plain fields and reuse the clamped helpers in `@/lib/time24`.
 */
export default function TimeFieldHM({
  value,
  onChange,
  disabled,
  ariaLabel = "Time",
  className,
}: TimeFieldHMProps) {
  const { hh, mm } = splitHHMM(value ?? "");
  const [open, setOpen] = useState<null | "hh" | "mm">(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Centre the current value in the popup when it opens (scroll the list only).
  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const sel = list.querySelector<HTMLElement>('[data-selected="true"]');
    if (sel)
      list.scrollTop =
        sel.offsetTop - list.clientHeight / 2 + sel.clientHeight / 2;
  }, [open]);

  const inputCls =
    "w-7 bg-transparent text-center text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white/90";

  const options = open === "hh" ? HOURS : MINUTES;
  const selectedOpt = open === "hh" ? padTimePart(hh) : padTimePart(mm);

  return (
    <div
      className={`shadow-theme-xs focus-within:border-brand-300 focus-within:ring-brand-500/10 relative flex h-11 items-center justify-center gap-0.5 rounded-lg border border-gray-300 bg-transparent px-2 focus-within:ring-3 dark:border-gray-700 dark:bg-gray-900 ${className ?? ""}`}
    >
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH"
        aria-label={`${ariaLabel} — hour (00–23)`}
        value={hh}
        disabled={disabled}
        onFocus={() => setOpen("hh")}
        onBlur={() => {
          setOpen((o) => (o === "hh" ? null : o));
          if (hh) onChange(joinHHMM(padTimePart(hh), mm));
        }}
        onChange={(e) => onChange(joinHHMM(clampHour(e.target.value), mm))}
        className={inputCls}
      />
      <span className="text-sm text-gray-500 dark:text-gray-400">:</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="MM"
        aria-label={`${ariaLabel} — minute (00–59)`}
        value={mm}
        disabled={disabled}
        onFocus={() => setOpen("mm")}
        onBlur={() => {
          setOpen((o) => (o === "mm" ? null : o));
          if (mm) onChange(joinHHMM(hh, padTimePart(mm)));
        }}
        onChange={(e) => onChange(joinHHMM(hh, clampMinute(e.target.value)))}
        className={inputCls}
      />
      {open ? (
        <ul
          ref={listRef}
          role="listbox"
          // Keep the focused input from blurring before the option click lands.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-1/2 z-20 mt-1 max-h-44 w-16 -translate-x-1/2 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {options.map((opt) => {
            const selected = selectedOpt === opt;
            return (
              <li key={opt}>
                <button
                  type="button"
                  data-selected={selected}
                  onClick={() => {
                    onChange(
                      open === "hh" ? joinHHMM(opt, mm) : joinHHMM(hh, opt),
                    );
                    setOpen(null);
                  }}
                  className={`block w-full px-3 py-1 text-center text-sm ${
                    selected
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
