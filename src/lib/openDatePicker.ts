/**
 * Open the native calendar picker for a focused date input, if possible.
 * No-op unless the target is an enabled `<input type="date">` that supports
 * `showPicker()`. Errors (e.g. missing user activation) are swallowed.
 *
 * Wired as a global `focusin` handler so every date input across the app pops
 * its calendar on focus — see {@link DateInputCalendarAutoOpen}.
 */
export function maybeOpenDatePicker(target: EventTarget | null): void {
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "date") return;
  if (target.disabled || target.readOnly) return;
  if (typeof target.showPicker !== "function") return;
  try {
    target.showPicker();
  } catch {
    // showPicker requires transient user activation; ignore when blocked.
  }
}
