/** Normalize an admin API base URL before using it as either a URL or mode flag. */
export function normalizeAdminApiUrl(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim().replace(/\/+$/, "");
  return normalized || undefined;
}

export function isAdminApiConfigured(
  value: string | null | undefined,
): boolean {
  return normalizeAdminApiUrl(value) !== undefined;
}
