export const NOTIFICATION_DISMISSED_STORAGE_KEY =
  "gogocash-admin-notification-dismissed";

export function mergeDismissedNotificationKeys(
  existing: string[],
  next: string[],
): string[] {
  return Array.from(new Set([...existing, ...next]));
}

export function loadDismissedNotificationKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_DISMISSED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => typeof key === "string");
  } catch {
    return [];
  }
}

export function saveDismissedNotificationKeys(keys: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOTIFICATION_DISMISSED_STORAGE_KEY,
    JSON.stringify(keys),
  );
}

/** Bell badge is shown only when at least one notification key is not dismissed. */
export function hasUnreadNotifications(
  allKeys: string[],
  dismissedKeys: string[],
): boolean {
  const dismissed = new Set(dismissedKeys);
  return allKeys.some((key) => !dismissed.has(key));
}
