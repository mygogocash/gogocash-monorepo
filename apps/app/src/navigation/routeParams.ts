export function normalizeRouteParam(
  value: string | string[] | undefined,
  fallback = "",
  maxLength = 96
): string {
  const rawValue = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  const decodedValue = safeDecodeURIComponent(rawValue);
  const normalizedValue = decodedValue
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[/\\]+/g, "-")
    .replace(/[<>`"'{}[\]|^~]/g, "-")
    .replace(/\.\.+/g, "")
    .replace(/[^A-Za-z0-9&%+.,:_ -]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim()
    .slice(0, maxLength)
    .replace(/^-|-$/g, "");

  return normalizedValue || fallback;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
