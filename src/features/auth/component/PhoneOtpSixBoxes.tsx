"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type PhoneOtpSixBoxesProps = {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  /** Figma 9573:224305 — red border + red digit when code is invalid */
  hasError?: boolean;
  ariaLabel: string;
  /** Announced when `hasError` (e.g. id of sibling element with error copy). */
  errorDescriptionId?: string;
  idPrefix?: string;
};

/**
 * Six single-digit OTP cells — layout matches GoGoCash 1.1 Figma (56×56, 16px gap, two groups of 3 with 32px between).
 */
export function PhoneOtpSixBoxes({
  value,
  onChange,
  disabled,
  hasError,
  ariaLabel,
  errorDescriptionId,
  idPrefix = "auth-phone-otp",
}: PhoneOtpSixBoxesProps) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = useCallback((i: number) => {
    window.requestAnimationFrame(() => refs.current[i]?.focus());
  }, []);

  const commit = useCallback(
    (chars: string[]) => {
      onChange(chars.join("").slice(0, 6));
    },
    [onChange]
  );

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const arr = digits.split("");
    while (arr.length < 6) arr.push("");

    if (raw.length === 0) {
      arr[index] = "";
      commit(arr);
      if (index > 0) focusAt(index - 1);
      return;
    }

    if (raw.length >= 6) {
      onChange(raw.slice(0, 6));
      focusAt(5);
      return;
    }

    const ch = raw.slice(-1);
    arr[index] = ch;
    commit(arr);
    if (index < 5) focusAt(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const arr = digits.split("");
      while (arr.length < 6) arr.push("");
      if (!arr[index] && index > 0) {
        e.preventDefault();
        arr[index - 1] = "";
        commit(arr);
        focusAt(index - 1);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text) {
      onChange(text);
      focusAt(Math.min(text.length, 5));
    }
  };

  const renderCell = (i: number) => (
    <input
      key={i}
      ref={(el) => {
        refs.current[i] = el;
      }}
      id={`${idPrefix}-${i}`}
      type="text"
      inputMode="numeric"
      autoComplete={i === 0 ? "one-time-code" : "off"}
      maxLength={1}
      autoFocus={i === 0}
      disabled={disabled}
      value={digits[i] ?? ""}
      onChange={(e) => handleChange(i, e)}
      onKeyDown={(e) => handleKeyDown(i, e)}
      onPaste={i === 0 ? handlePaste : undefined}
      aria-label={`${ariaLabel} ${i + 1}`}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError && errorDescriptionId ? errorDescriptionId : undefined}
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-2xl border border-solid bg-white text-center font-semibold tabular-nums outline-none transition-[border-color,box-shadow,color] disabled:opacity-60 lg:size-12",
        hasError
          ? "border-[rgba(205,13,13,0.4)] text-[#cd0d0d] text-[28px] leading-none focus-visible:border-[#cd0d0d] focus-visible:ring-2 focus-visible:ring-[#cd0d0d]/25 lg:text-[32px]"
          : "border-[rgba(152,152,152,0.4)] text-lg text-[#3b3b3b] focus-visible:border-[#00cc99] focus-visible:ring-2 focus-visible:ring-[#00cc99]/20 lg:text-base"
      )}
    />
  );

  return (
    <div
      className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-3"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex gap-4">{[0, 1, 2].map(renderCell)}</div>
      <div className="flex gap-4">{[3, 4, 5].map(renderCell)}</div>
    </div>
  );
}
