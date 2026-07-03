import type { MobileSessionField } from "@mobile/config/mobileAppConfig";
import { DEMO_MOBILE_SESSION_TOKEN } from "@mobile/auth/sessionValidity";

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

type MobileSessionChangeListener = () => void;
const mobileSessionChangeListeners = new Set<MobileSessionChangeListener>();

/** Announce a session write/clear so reactive consumers (e.g. the header) re-read. */
export function notifyMobileSessionChange(): void {
  for (const listener of [...mobileSessionChangeListeners]) {
    listener();
  }
}

/**
 * Subscribe to session changes; returns an unsubscribe fn. On web it also reacts
 * to cross-tab `storage` events so sign-in/out in one tab updates the others.
 */
export function subscribeMobileSessionChange(
  listener: MobileSessionChangeListener
): () => void {
  mobileSessionChangeListeners.add(listener);

  let onStorage: ((event: StorageEvent) => void) | undefined;
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    onStorage = (event) => {
      if (event.key === null || event.key === mobileSessionStorageKey) {
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
  }

  return () => {
    mobileSessionChangeListeners.delete(listener);
    if (onStorage && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

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
    async setSession(session) {
      await secureStore.setItemAsync(mobileSessionStorageKey, JSON.stringify(session));
      notifyMobileSessionChange();
    },
    async clearSession() {
      await secureStore.deleteItemAsync(mobileSessionStorageKey);
      notifyMobileSessionChange();
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
      notifyMobileSessionChange();
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
      notifyMobileSessionChange();
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

/**
 * Build a client-side demo sign-in session for the phone-OTP flow.
 *
 * The phone screen verifies a fixed demo code (there is no Firebase phone backend yet), so
 * there is no server-issued token to persist. This stamps a session with a truthy
 * `access_token` so `useAuthGuardSession` flips to signed-in — mirroring the dev raw-token
 * session used by the OAuth callback. Replace with the real Firebase token exchange once the
 * phone-auth backend lands.
 */
export function buildDemoMobileSession(overrides: MobileSession = {}): MobileSession {
  return {
    access_token: DEMO_MOBILE_SESSION_TOKEN,
    auth_flow: "phone",
    is_new_user: false,
    provider: "firebase",
    ...overrides,
  } satisfies MobileSession;
}

/**
 * Persist a session to whichever store the runtime supports (web localStorage / native secure
 * store). `setSession` fires `notifyMobileSessionChange()`, so reactive consumers — the auth
 * guard and the header — re-read and re-render without a navigator remount.
 */
export async function persistMobileSession(session: MobileSession): Promise<void> {
  const store = await createAvailableSessionStore();
  await store?.setSession(session);
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
