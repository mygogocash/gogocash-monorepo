import { Platform } from "react-native";

const REGION_STORAGE_KEY = "gogocash.region";

export function readStoredRegionSync(): string | null {
  try {
    if (Platform.OS === "web") {
      return globalThis.localStorage?.getItem(REGION_STORAGE_KEY) ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function readStoredRegion(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return globalThis.localStorage?.getItem(REGION_STORAGE_KEY) ?? null;
    }
    const secureStore = await import("expo-secure-store");
    return (await secureStore.getItemAsync?.(REGION_STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function writeStoredRegion(region: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(REGION_STORAGE_KEY, region);
      return;
    }
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync?.(REGION_STORAGE_KEY, region);
  } catch {
    // Non-fatal: the choice just won't persist beyond this session.
  }
}
