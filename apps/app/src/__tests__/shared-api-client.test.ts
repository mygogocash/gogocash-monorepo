import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSharedMobileApiClient,
  resetSharedMobileApiClientForTests,
} from "../api/sharedClient";
import {
  getSharedSessionStore,
  resetSharedSessionStoreForTests,
} from "../auth/sharedSessionStore";
import type { MobileSessionStore } from "../auth/session";

function makeStore(): MobileSessionStore {
  return {
    clearSession: vi.fn(async () => {}),
    getSession: vi.fn(async () => ({ access_token: "t" })),
    setSession: vi.fn(async () => {}),
  };
}

async function seedSharedStore(store: MobileSessionStore | null) {
  await getSharedSessionStore(async () => store);
}

describe("getSharedMobileApiClient", () => {
  afterEach(() => {
    resetSharedMobileApiClientForTests();
    resetSharedSessionStoreForTests();
  });

  it("given the same apiUrl twice > then returns the identical client instance", async () => {
    await seedSharedStore(makeStore());

    const first = await getSharedMobileApiClient("https://api-staging.gogocash.co");
    const second = await getSharedMobileApiClient("https://api-staging.gogocash.co");

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it("given a different apiUrl > then builds a new client", async () => {
    await seedSharedStore(makeStore());

    const first = await getSharedMobileApiClient("https://api-staging.gogocash.co");
    const second = await getSharedMobileApiClient("http://localhost:8080");

    expect(second).not.toBe(first);
  });

  it("given no session store is available > then resolves null", async () => {
    await seedSharedStore(null);

    const client = await getSharedMobileApiClient("https://api-staging.gogocash.co");

    expect(client).toBeNull();
  });
});

describe("useCustomerAccountResource source contract", () => {
  it("the hook no longer rebuilds the session store or client inside queryFn", () => {
    const resourceFile = readFileSync(
      join(__dirname, "..", "account", "customerAccountResource.ts"),
      "utf8"
    );

    expect(resourceFile).toContain("getSharedMobileApiClient");
    expect(resourceFile).not.toContain("createAvailableSessionStore");
  });
});
