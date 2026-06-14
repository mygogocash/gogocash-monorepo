import { Platform } from "react-native";

// Persisted locale preference. Non-sensitive, so we mirror session.ts's storage strategy
// (web -> localStorage, native -> expo-secure-store via dynamic import) without adding a new dep.
const LOCALE_STORAGE_KEY = "gogocash.locale";

// Synchronous read for the web initial render — lets LocaleProvider seed its
// initial state from storage before first paint, avoiding the en->stored flash.
// Web-only: native storage (expo-secure-store) has no sync API, so this returns
// null off-web and native gates its first paint on the async read instead.
export function readStoredLocaleSync(): string | null {
  try {
    if (Platform.OS === "web") {
      return globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? null;
    }
    return null;
  } catch {
    // Storage unavailable in this runtime — fall back to default/device locale.
    return null;
  }
}

export async function readStoredLocale(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? null;
    }
    const secureStore = await import("expo-secure-store");
    return (await secureStore.getItemAsync?.(LOCALE_STORAGE_KEY)) ?? null;
  } catch {
    // Storage unavailable in this runtime — fall back to default/device locale.
    return null;
  }
}

export async function writeStoredLocale(locale: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
      return;
    }
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync?.(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Non-fatal: the choice just won't persist beyond this session.
  }
}
