import { Platform } from "react-native";

const REGION_STORAGE_KEY = "gogocash.region";
const REGION_BANNER_DISMISSED_KEY = "gogocash.regionBannerDismissed";

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

/** One-time detected-region confirm banner: dismissed forever once true. */
export async function readRegionBannerDismissed(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return globalThis.localStorage?.getItem(REGION_BANNER_DISMISSED_KEY) === "1";
    }
    const secureStore = await import("expo-secure-store");
    return (await secureStore.getItemAsync?.(REGION_BANNER_DISMISSED_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function writeRegionBannerDismissed(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(REGION_BANNER_DISMISSED_KEY, "1");
      return;
    }
    const secureStore = await import("expo-secure-store");
    await secureStore.setItemAsync?.(REGION_BANNER_DISMISSED_KEY, "1");
  } catch {
    // Non-fatal: the banner may reappear next launch.
  }
}
