"use client";

import { useEffect } from "react";
import { maybeOpenDatePicker } from "@/lib/openDatePicker";

/**
 * App-wide default behaviour: focusing any `<input type="date">` opens its
 * native calendar picker immediately (no extra click on the calendar icon).
 * Mounted once near the app root; renders nothing.
 */
export default function DateInputCalendarAutoOpen() {
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => maybeOpenDatePicker(e.target);
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
  return null;
}
