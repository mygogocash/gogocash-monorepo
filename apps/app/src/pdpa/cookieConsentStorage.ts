import { Platform } from "react-native";

import { webCookieConsentBanner } from "@mobile/design/webDesignParity";

const STORAGE_KEY = webCookieConsentBanner.dismissedStorageKey;
const DISMISSED_VALUE = "1";

export function readCookieConsentDismissedSync(): boolean {
  try {
    if (Platform.OS === "web") {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
      return raw === DISMISSED_VALUE;
    }
    return false;
  } catch {
    return false;
  }
}

export async function readCookieConsentDismissed(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
      return raw === DISMISSED_VALUE;
    }
    const secureStore = await import("expo-secure-store");
    const raw = (await secureStore.getItemAsync?.(STORAGE_KEY)) ?? null;
    return raw === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export async function writeCookieConsentDismissed(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(STORAGE_KEY, DISMISSED_VALUE);
      return;
    }
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync?.(STORAGE_KEY, DISMISSED_VALUE);
  } catch {
    // Non-fatal: dismissal won't persist beyond this session.
  }
}
