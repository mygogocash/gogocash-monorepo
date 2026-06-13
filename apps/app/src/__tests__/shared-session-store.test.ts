import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSharedSessionStore,
  resetSharedSessionStoreForTests,
} from "../auth/sharedSessionStore";
import type { MobileSessionStore } from "../auth/session";

function makeStore(): MobileSessionStore {
  return {
    clearSession: vi.fn(async () => {}),
    getSession: vi.fn(async () => null),
    setSession: vi.fn(async () => {}),
  };
}

describe("getSharedSessionStore", () => {
  afterEach(() => {
    resetSharedSessionStoreForTests();
  });

  it("given two concurrent awaits > then the factory runs once and both resolve the same store", async () => {
    const store = makeStore();
    const factory = vi.fn(async () => store);

    const [first, second] = await Promise.all([
      getSharedSessionStore(factory),
      getSharedSessionStore(factory),
    ]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toBe(store);
    expect(second).toBe(store);
  });

  it("given sequential calls > then the memoized store is reused without re-running the factory", async () => {
    const factory = vi.fn(async () => makeStore());

    const first = await getSharedSessionStore(factory);
    const second = await getSharedSessionStore(factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("given resetSharedSessionStoreForTests > then the next call rebuilds via the factory", async () => {
    const factory = vi.fn(async () => makeStore());

    const first = await getSharedSessionStore(factory);
    resetSharedSessionStoreForTests();
    const second = await getSharedSessionStore(factory);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(second).not.toBe(first);
  });
});
