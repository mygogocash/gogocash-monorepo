import { describe, expect, it, vi } from "vitest";

import {
  applyOtaUpdateIfAvailable,
  type OtaUpdateDeps,
} from "@mobile/updates/applyOtaUpdateIfAvailable";

function createDeps(overrides: Partial<OtaUpdateDeps> = {}): OtaUpdateDeps {
  return {
    checkForUpdateAsync: vi.fn(async () => ({ isAvailable: false })),
    fetchUpdateAsync: vi.fn(async () => ({})),
    reloadAsync: vi.fn(async () => undefined),
    isEnabled: true,
    platformOs: "android",
    ...overrides,
  };
}

describe("applyOtaUpdateIfAvailable", () => {
  it("applyOtaUpdateIfAvailable > given web platform > then skips without checking", async () => {
    const deps = createDeps({ platformOs: "web" });

    await expect(applyOtaUpdateIfAvailable(deps)).resolves.toBe("skipped");
    expect(deps.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it("applyOtaUpdateIfAvailable > given updates disabled > then skips without checking", async () => {
    const deps = createDeps({ isEnabled: false });

    await expect(applyOtaUpdateIfAvailable(deps)).resolves.toBe("skipped");
    expect(deps.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it("applyOtaUpdateIfAvailable > given no pending update > then returns none", async () => {
    const deps = createDeps();

    await expect(applyOtaUpdateIfAvailable(deps)).resolves.toBe("none");
    expect(deps.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(deps.reloadAsync).not.toHaveBeenCalled();
  });

  it("applyOtaUpdateIfAvailable > given pending update > then fetches and reloads", async () => {
    const deps = createDeps({
      checkForUpdateAsync: vi.fn(async () => ({ isAvailable: true })),
    });

    await expect(applyOtaUpdateIfAvailable(deps)).resolves.toBe("reloaded");
    expect(deps.fetchUpdateAsync).toHaveBeenCalledOnce();
    expect(deps.reloadAsync).toHaveBeenCalledOnce();
  });

  it("applyOtaUpdateIfAvailable > given check throws > then skips without crashing", async () => {
    const deps = createDeps({
      checkForUpdateAsync: vi.fn(async () => {
        throw new Error("offline");
      }),
    });

    await expect(applyOtaUpdateIfAvailable(deps)).resolves.toBe("skipped");
    expect(deps.fetchUpdateAsync).not.toHaveBeenCalled();
  });
});
