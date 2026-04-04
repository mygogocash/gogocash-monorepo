"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  length?: number; // default 6
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
};

export default function OtpInput({ length = 6, onChange, onComplete, disabled }: Props) {
  const [values, setValues] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => values.join(""), [values]);

  useEffect(() => {
    onChange?.(code);
    if (code.length === length && !values.includes("")) onComplete?.(code);
  }, [code, length, onChange, onComplete, values]);

  const focusIndex = (i: number) => refs.current[i]?.focus();

  const setAt = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    setValues(next);
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(0, 1);
    setAt(i, digit);
    if (digit && i < length - 1) focusIndex(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (values[i]) {
        setAt(i, "");
      } else if (i > 0) {
        focusIndex(i - 1);
        setAt(i - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && i > 0) focusIndex(i - 1);
    if (e.key === "ArrowRight" && i < length - 1) focusIndex(i + 1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);

    if (!pasted) return;

    const next = Array(length).fill("");
    pasted.split("").forEach((ch, idx) => (next[idx] = ch));
    setValues(next);

    const nextFocus = Math.min(pasted.length, length) - 1;
    if (nextFocus >= 0) focusIndex(nextFocus);
  };

  return (
    <div
      onPaste={handlePaste}
      style={{ display: "flex", gap: 10 }}
      aria-label="One time password input"
    >
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          style={{
            width: 44,
            height: 52,
            textAlign: "center",
            fontSize: 22,
            borderRadius: 10,
            border: "1px solid #ccc",
            outline: "none",
          }}
        />
      ))}
    </div>
  );
}
