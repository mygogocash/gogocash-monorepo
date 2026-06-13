import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getNextAuthSecret", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns explicit NEXTAUTH_SECRET in production runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("npm_lifecycle_event", "start");
    vi.stubEnv("NEXTAUTH_SECRET", "production-secret-at-least-32-characters-long!!");
    const { getNextAuthSecret } = await import("./nextAuthSecret");
    expect(getNextAuthSecret()).toBe("production-secret-at-least-32-characters-long!!");
  });

  it("throws in production runtime when secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("npm_lifecycle_event", "start");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    const { getNextAuthSecret } = await import("./nextAuthSecret");
    expect(() => getNextAuthSecret()).toThrow(/NEXTAUTH_SECRET is required/);
  });

  it("allows build placeholder when npm_lifecycle_event is build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("npm_lifecycle_event", "build");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    const { getNextAuthSecret } = await import("./nextAuthSecret");
    expect(getNextAuthSecret()).toContain("dev-only-nextauth-secret");
  });
});
