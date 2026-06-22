import { Platform } from "react-native";

import {
  parseThemePreference,
  type ThemePreference,
} from "@mobile/theme/themePreference";

export const THEME_PREFERENCE_STORAGE_KEY = "gogocash.theme.preference";

export function readStoredThemePreferenceSync(): ThemePreference | null {
  try {
    if (Platform.OS === "web") {
      const raw = globalThis.localStorage?.getItem(THEME_PREFERENCE_STORAGE_KEY) ?? null;
      return raw ? parseThemePreference(raw) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function readStoredThemePreference(): Promise<ThemePreference | null> {
  try {
    if (Platform.OS === "web") {
      const raw = globalThis.localStorage?.getItem(THEME_PREFERENCE_STORAGE_KEY) ?? null;
      return raw ? parseThemePreference(raw) : null;
    }
    const secureStore = await import("expo-secure-store");
    const raw = (await secureStore.getItemAsync?.(THEME_PREFERENCE_STORAGE_KEY)) ?? null;
    return raw ? parseThemePreference(raw) : null;
  } catch {
    return null;
  }
}

export async function writeStoredThemePreference(preference: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
      return;
    }
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync?.(THEME_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // Non-fatal: preference won't persist beyond this session.
  }
}
