/** Flatpickr display: dd/mm/yyyy, HH:mm (English 24-hour). */
export const ADMIN_DATETIME_ALT_FORMAT = "d/m/Y, H:i";

/** Flatpickr stored value for datetime fields (ISO-like local string). */
export const ADMIN_DATETIME_VALUE_FORMAT = "Y-m-d\\TH:i";

export function resolveDatePickerTimeOptions(
  enableTime: boolean,
  altFormat?: string,
): { altFormat?: string; time_24hr: boolean } {
  if (!enableTime) {
    return { altFormat, time_24hr: true };
  }

  return {
    altFormat: altFormat ?? ADMIN_DATETIME_ALT_FORMAT,
    time_24hr: true,
  };
}
