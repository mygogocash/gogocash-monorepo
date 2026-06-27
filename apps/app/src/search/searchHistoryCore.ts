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
    return dedupeSearchTerms(
      parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    ).slice(0, SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function dedupeSearchTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const term of terms) {
    const normalized = normalizeSearchQuery(term);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function createSerializedRunner() {
  let chain: Promise<unknown> = Promise.resolve();

  return function runSerialized<T>(task: () => Promise<T>): Promise<T> {
    const next = chain.then(task, task);
    chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };
}
