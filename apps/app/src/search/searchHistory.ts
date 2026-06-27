import { Platform } from "react-native";

import {
  createSerializedRunner,
  parseSearchHistoryPayload,
  pushSearchHistory,
  removeSearchHistoryItem as removeSearchHistoryItemCore,
  SEARCH_HISTORY_MAX,
} from "@mobile/search/searchHistoryCore";

export {
  createSerializedRunner,
  dedupeSearchTerms,
  normalizeSearchQuery,
  pushSearchHistory,
  SEARCH_HISTORY_MAX,
} from "@mobile/search/searchHistoryCore";

export const SEARCH_HISTORY_STORAGE_KEY = "gogocash.search.recent.v1";

const runSerialized = createSerializedRunner();

export async function readSearchHistory(): Promise<string[]> {
  try {
    if (Platform.OS === "web") {
      const raw = globalThis.localStorage?.getItem(SEARCH_HISTORY_STORAGE_KEY) ?? null;
      return parseSearchHistoryPayload(raw);
    }
    const secureStore = await import("expo-secure-store");
    const raw = (await secureStore.getItemAsync?.(SEARCH_HISTORY_STORAGE_KEY)) ?? null;
    return parseSearchHistoryPayload(raw);
  } catch {
    return [];
  }
}

export async function writeSearchHistory(history: readonly string[]): Promise<void> {
  try {
    const payload = JSON.stringify(history.slice(0, SEARCH_HISTORY_MAX));
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(SEARCH_HISTORY_STORAGE_KEY, payload);
      return;
    }
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync?.(SEARCH_HISTORY_STORAGE_KEY, payload);
  } catch {
    // Non-fatal: history won't persist beyond this session.
  }
}

export async function clearSearchHistory(): Promise<void> {
  await runSerialized(async () => {
    await writeSearchHistory([]);
  });
}

export async function recordSearchQuery(query: string): Promise<string[]> {
  return runSerialized(async () => {
    const current = await readSearchHistory();
    const next = pushSearchHistory(current, query);
    await writeSearchHistory(next);
    return next;
  });
}

export async function removeSearchHistoryItem(query: string): Promise<string[]> {
  return runSerialized(async () => {
    const current = await readSearchHistory();
    const next = removeSearchHistoryItemCore(current, query);
    await writeSearchHistory(next);
    return next;
  });
}
