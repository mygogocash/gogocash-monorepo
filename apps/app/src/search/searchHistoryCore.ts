export const SEARCH_HISTORY_MAX = 10;

export function normalizeSearchQuery(raw: string): string {
  return raw.trim();
}

export function pushSearchHistory(history: readonly string[], query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return [...history];
  }
  const withoutDupes = history.filter(
    (item) => item.toLowerCase() !== normalized.toLowerCase()
  );
  return [normalized, ...withoutDupes].slice(0, SEARCH_HISTORY_MAX);
}

export function removeSearchHistoryItem(history: readonly string[], query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return [...history];
  }
  return history.filter((item) => item.toLowerCase() !== normalized.toLowerCase());
}

export function parseSearchHistoryPayload(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}
