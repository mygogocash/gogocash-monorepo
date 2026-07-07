import { Platform } from "react-native";

const STORAGE_KEY = "gogocash.gototrack.backgroundPromptsEnabled";

type SecureStoreLike = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

function readWebFlag(): boolean | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) {
    return null;
  }
  return raw === "1";
}

function writeWebFlag(enabled: boolean): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

async function resolveSecureStore(): Promise<SecureStoreLike | null> {
  try {
    const secureStore = await import("expo-secure-store");
    if (
      typeof secureStore.getItemAsync !== "function" ||
      typeof secureStore.setItemAsync !== "function" ||
      typeof secureStore.deleteItemAsync !== "function"
    ) {
      return null;
    }
    return secureStore;
  } catch {
    return null;
  }
}

/** Native monitor service reads this opt-in flag (default off). */
export async function readBackgroundPromptsEnabled(): Promise<boolean> {
  if (Platform.OS === "web") {
    return readWebFlag() ?? false;
  }

  const secureStore = await resolveSecureStore();
  if (!secureStore) {
    return false;
  }

  const raw = await secureStore.getItemAsync(STORAGE_KEY);
  return raw === "1";
}

export async function writeBackgroundPromptsEnabled(
  enabled: boolean,
): Promise<void> {
  if (Platform.OS === "web") {
    writeWebFlag(enabled);
    return;
  }

  const secureStore = await resolveSecureStore();
  if (!secureStore) {
    return;
  }

  if (enabled) {
    await secureStore.setItemAsync(STORAGE_KEY, "1");
    return;
  }

  await secureStore.deleteItemAsync(STORAGE_KEY);
}

export const backgroundPromptsStorageKey = STORAGE_KEY;
