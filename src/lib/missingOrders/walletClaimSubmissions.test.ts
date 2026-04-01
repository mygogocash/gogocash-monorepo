/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendMissingOrderClaimToLocalStorage,
  getMissingOrderClaimAccountKey,
  getMissingOrderClaimStorageKey,
  MISSING_ORDER_CLAIM_EVENTS,
  MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY,
  readMissingOrderClaimsFromLocalStorage,
} from "./walletClaimSubmissions";

/** happy-dom v20+ can expose a Storage object without a working `clear`; use an in-memory mock. */
function createMemoryStorage(): Storage {
  const memory = new Map<string, string>();
  return {
    get length() {
      return memory.size;
    },
    clear() {
      memory.clear();
    },
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    key(index: number) {
      return [...memory.keys()][index] ?? null;
    },
    removeItem(key: string) {
      memory.delete(key);
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
  } as Storage;
}

beforeEach(() => {
  const storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  }
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("getMissingOrderClaimStorageKey", () => {
  it("scopes keys by account", () => {
    expect(getMissingOrderClaimStorageKey("user-abc")).toBe(
      "gogocash-missing-order-claims-v2:user-abc"
    );
    expect(getMissingOrderClaimStorageKey("  ")).toBe("gogocash-missing-order-claims-v2:guest");
  });
});

describe("getMissingOrderClaimAccountKey", () => {
  it("prefers _id over id", () => {
    expect(getMissingOrderClaimAccountKey({ id: "a", _id: "b" })).toBe("b");
  });

  it("falls back to id then guest", () => {
    expect(getMissingOrderClaimAccountKey({ id: "x" })).toBe("x");
    expect(getMissingOrderClaimAccountKey(null)).toBe("guest");
    expect(getMissingOrderClaimAccountKey({})).toBe("guest");
  });
});

describe("readMissingOrderClaimsFromLocalStorage / append", () => {
  it("migrates legacy storage once for guest", () => {
    const legacy = [
      {
        id: "l1",
        submittedAt: "2020-01-01T00:00:00.000Z",
        shopLabel: "Legacy Shop",
        orderId: "ORD-1",
        amount: "10",
        currency: "THB",
      },
    ];
    localStorage.setItem(MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY, JSON.stringify(legacy));

    const read = readMissingOrderClaimsFromLocalStorage("guest");
    expect(read).toHaveLength(1);
    expect(read[0]?.orderId).toBe("ORD-1");
    expect(localStorage.getItem(MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(getMissingOrderClaimStorageKey("guest"))).toContain("ORD-1");
  });

  it("does not migrate legacy for signed-in users", () => {
    localStorage.setItem(
      MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "x",
          submittedAt: "2020-01-01T00:00:00.000Z",
          shopLabel: "S",
          orderId: "O",
          amount: "1",
          currency: "THB",
        },
      ])
    );
    expect(readMissingOrderClaimsFromLocalStorage("user-1")).toEqual([]);
    expect(localStorage.getItem(MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY)).not.toBeNull();
  });

  it("partitions data by account key", () => {
    appendMissingOrderClaimToLocalStorage("alice", {
      submittedAt: "2021-01-01T00:00:00.000Z",
      shopLabel: "A",
      orderId: "1",
      amount: "1",
      currency: "THB",
    });
    appendMissingOrderClaimToLocalStorage("bob", {
      submittedAt: "2021-01-02T00:00:00.000Z",
      shopLabel: "B",
      orderId: "2",
      amount: "2",
      currency: "THB",
    });
    expect(readMissingOrderClaimsFromLocalStorage("alice").map((r) => r.orderId)).toEqual(["1"]);
    expect(readMissingOrderClaimsFromLocalStorage("bob").map((r) => r.orderId)).toEqual(["2"]);
  });

  it("dispatches updated event on append", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    appendMissingOrderClaimToLocalStorage("guest", {
      submittedAt: new Date().toISOString(),
      shopLabel: "S",
      orderId: "Z",
      amount: "0",
      currency: "THB",
    });
    expect(spy).toHaveBeenCalled();
    const evt = spy.mock.calls.find((c) => c[0] instanceof Event)?.[0] as Event | undefined;
    expect(evt?.type).toBe(MISSING_ORDER_CLAIM_EVENTS.updated);
  });
});
