import type { MobileSessionField } from "@mobile/config/mobileAppConfig";

export type MobileSession = Partial<Record<MobileSessionField, string | boolean | null>>;

export type MobileSessionStore = {
  getSession: () => Promise<MobileSession | null>;
  setSession: (session: MobileSession) => Promise<void> | void;
  clearSession: () => Promise<void> | void;
};

export type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void> | void;
  deleteItemAsync: (key: string) => Promise<void> | void;
};

export const mobileSessionStorageKey = "gogocash.mobile.session.v1";

type WebStorageLike = {
  getItem?: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem?: (key: string, value: string) => void;
};

export function createSecureSessionStore(secureStore: SecureStoreLike): MobileSessionStore {
  return {
    async getSession() {
      const storedValue = await secureStore.getItemAsync(mobileSessionStorageKey);

      if (!storedValue) {
        return null;
      }

      try {
        const parsed = JSON.parse(storedValue);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          await secureStore.deleteItemAsync(mobileSessionStorageKey);
          return null;
        }

        return parsed as MobileSession;
      } catch {
        await secureStore.deleteItemAsync(mobileSessionStorageKey);
        return null;
      }
    },
    setSession(session) {
      return secureStore.setItemAsync(mobileSessionStorageKey, JSON.stringify(session));
    },
    clearSession() {
      return secureStore.deleteItemAsync(mobileSessionStorageKey);
    },
  };
}

export async function createExpoSecureSessionStore(): Promise<MobileSessionStore> {
  const secureStore = await import("expo-secure-store");

  if (
    typeof secureStore.getItemAsync !== "function" ||
    typeof secureStore.setItemAsync !== "function" ||
    typeof secureStore.deleteItemAsync !== "function"
  ) {
    throw new Error("Expo SecureStore is not available in this runtime.");
  }

  if (typeof secureStore.isAvailableAsync === "function") {
    const isAvailable = await secureStore.isAvailableAsync();

    if (!isAvailable) {
      throw new Error("Expo SecureStore is not available in this runtime.");
    }
  }

  return createSecureSessionStore(secureStore);
}

export function createWebSessionStore(
  storage: WebStorageLike | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined
): MobileSessionStore | null {
  if (!storage || !storage.getItem || !storage.setItem) {
    return null;
  }

  return {
    async clearSession() {
      storage.removeItem(mobileSessionStorageKey);
    },
    async getSession() {
      const storedValue = storage.getItem?.(mobileSessionStorageKey);

      if (!storedValue) {
        return null;
      }

      try {
        const parsed = JSON.parse(storedValue);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as MobileSession)
          : null;
      } catch {
        storage.removeItem(mobileSessionStorageKey);
        return null;
      }
    },
    async setSession(session) {
      storage.setItem?.(mobileSessionStorageKey, JSON.stringify(session));
    },
  };
}

export async function createAvailableSessionStore(): Promise<MobileSessionStore | null> {
  const webStore = createWebSessionStore();

  if (typeof window !== "undefined" && webStore) {
    return webStore;
  }

  try {
    return await createExpoSecureSessionStore();
  } catch {
    return webStore;
  }
}

export async function clearMobileAppSession(
  options: {
    secureStore?: MobileSessionStore | null;
    webStore?: MobileSessionStore | null;
  } = {}
) {
  const stores: MobileSessionStore[] = [];

  if (options.secureStore !== undefined) {
    if (options.secureStore) {
      stores.push(options.secureStore);
    }
  } else {
    try {
      stores.push(await createExpoSecureSessionStore());
    } catch {
      // Web builds and unsupported runtimes fall back to localStorage below.
    }
  }

  if (options.webStore !== undefined) {
    if (options.webStore) {
      stores.push(options.webStore);
    }
  } else {
    const webStore = createWebSessionStore();
    if (webStore) {
      stores.push(webStore);
    }
  }

  await Promise.all(stores.map((store) => store.clearSession()));
}
