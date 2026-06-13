import { describe, expect, it, vi } from "vitest";

import {
  clearMobileAppSession,
  createAvailableSessionStore,
  createSecureSessionStore,
  createWebSessionStore,
  mobileSessionStorageKey,
} from "@mobile/auth/session";

describe("GoGoCash mobile secure session store", () => {
  it("secure session store > given web-shaped session > then persists it as one secure json value", async () => {
    const secureStore = {
      getItemAsync: vi.fn(),
      setItemAsync: vi.fn(),
      deleteItemAsync: vi.fn(),
    };
    const store = createSecureSessionStore(secureStore);

    await store.setSession({
      _id: "user-1",
      access_token: "token-1",
      email: "tester@gogocash.co",
      provider: "firebase",
      wallet: "100.00",
    });

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      mobileSessionStorageKey,
      JSON.stringify({
        _id: "user-1",
        access_token: "token-1",
        email: "tester@gogocash.co",
        provider: "firebase",
        wallet: "100.00",
      })
    );
  });

  it("secure session store > given corrupt secure storage json > then clears and returns null", async () => {
    const secureStore = {
      getItemAsync: vi.fn(async () => "{not-json"),
      setItemAsync: vi.fn(),
      deleteItemAsync: vi.fn(),
    };
    const store = createSecureSessionStore(secureStore);

    await expect(store.getSession()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(mobileSessionStorageKey);
  });

  it("logout session store > given secure and web fallback storage > then clears both stores", async () => {
    const secureStore = {
      getItemAsync: vi.fn(),
      setItemAsync: vi.fn(),
      deleteItemAsync: vi.fn(),
    };
    const localStorageMock = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    await clearMobileAppSession({
      secureStore: createSecureSessionStore(secureStore),
      webStore: createWebSessionStore(localStorageMock),
    });

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(mobileSessionStorageKey);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(mobileSessionStorageKey);
  });

  it("available session store > given an Expo web runtime > then uses localStorage before native SecureStore", async () => {
    const localStorageMock = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
    });

    const store = await createAvailableSessionStore();

    await store?.setSession({
      access_token: "web-session",
      provider: "design_qa",
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      mobileSessionStorageKey,
      JSON.stringify({
        access_token: "web-session",
        provider: "design_qa",
      })
    );

    vi.unstubAllGlobals();
  });
});
