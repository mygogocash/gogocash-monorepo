"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime24Input, padTimePart, splitHHMM } from "@/lib/time24";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

interface TimeFieldHMProps {
  /** Stored value as `HH:MM` (or partial / empty). */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * 24-hour time entry: one `HH : MM` field that stays typeable and, on focus,
 * opens a single popup with two scrollable number columns (hours 00–23 /
 * minutes 00–59) that centre on the current value. Native `<input type=time>`
 * can't be forced to 24h across browsers, so we drive a plain field and reuse
 * the helpers in `@/lib/time24`.
 */
export default function TimeFieldHM({
  value,
  onChange,
  disabled,
  ariaLabel = "Time",
  className,
}: TimeFieldHMProps) {
  const { hh, mm } = splitHHMM(value ?? "");
  const [open, setOpen] = useState(false);
  const hourRef = useRef<HTMLUListElement>(null);
  const minuteRef = useRef<HTMLUListElement>(null);

  // Centre each column on its selected value when the popup opens (scroll the
  // lists only — queries the DOM so the effect needs no hh/mm dependency).
  useEffect(() => {
    if (!open) return;
    for (const list of [hourRef.current, minuteRef.current]) {
      if (!list) continue;
      const sel = list.querySelector<HTMLElement>('[data-selected="true"]');
      if (sel)
        list.scrollTop =
          sel.offsetTop - list.clientHeight / 2 + sel.clientHeight / 2;
    }
  }, [open]);

  const pickHour = (opt: string) =>
    onChange(`${opt}:${mm === "" ? "00" : padTimePart(mm)}`);
  const pickMinute = (opt: string) =>
    onChange(`${hh === "" ? "00" : padTimePart(hh)}:${opt}`);

  const optionCls = (selected: boolean) =>
    `block w-full px-2 py-1 text-center text-sm ${
      selected
        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

  return (
    <div
      className={`shadow-theme-xs focus-within:border-brand-300 focus-within:ring-brand-500/10 relative flex h-11 w-28 items-center rounded-lg border border-gray-300 bg-transparent px-3 focus-within:ring-3 dark:border-gray-700 dark:bg-gray-900 ${className ?? ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH : MM"
        aria-label={`${ariaLabel} (24-hour HH:MM)`}
        value={value ?? ""}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => onChange(formatTime24Input(e.target.value))}
        className="w-full bg-transparent text-center text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white/90"
      />
      {open ? (
        <div
          // Keep the focused input from blurring before an option click lands.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-1/2 z-20 mt-1 flex w-28 -translate-x-1/2 gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <ul
            ref={hourRef}
            role="listbox"
            aria-label={`${ariaLabel} — hour`}
            className="max-h-44 flex-1 overflow-y-auto"
          >
            {HOURS.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  data-selected={padTimePart(hh) === opt}
                  onClick={() => pickHour(opt)}
                  className={optionCls(padTimePart(hh) === opt)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
          <ul
            ref={minuteRef}
            role="listbox"
            aria-label={`${ariaLabel} — minute`}
            className="max-h-44 flex-1 overflow-y-auto"
          >
            {MINUTES.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  data-selected={padTimePart(mm) === opt}
                  onClick={() => pickMinute(opt)}
                  className={optionCls(padTimePart(mm) === opt)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
