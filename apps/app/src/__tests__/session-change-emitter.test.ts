import { describe, expect, it, vi } from "vitest";

import {
  createSecureSessionStore,
  subscribeMobileSessionChange,
} from "@mobile/auth/session";

function mockSecureStore() {
  return {
    getItemAsync: vi.fn(async () => null),
    setItemAsync: vi.fn(async () => {}),
    deleteItemAsync: vi.fn(async () => {}),
  };
}

/**
 * The header bug: after sign-in the UI kept showing "Sign in" because
 * useMobileSessionSnapshot only read the session once and the store never
 * announced writes. These tests pin the emitter that makes login/logout reactive.
 */
describe("mobile session change emitter", () => {
  it("notifies subscribers when a session is written", async () => {
    const store = createSecureSessionStore(mockSecureStore());
    const listener = vi.fn();
    const unsubscribe = subscribeMobileSessionChange(listener);

    await store.setSession({ access_token: "t", provider: "firebase" });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("notifies on clear, and stops after unsubscribe", async () => {
    const store = createSecureSessionStore(mockSecureStore());
    const listener = vi.fn();
    const unsubscribe = subscribeMobileSessionChange(listener);

    await store.clearSession();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await store.clearSession();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
