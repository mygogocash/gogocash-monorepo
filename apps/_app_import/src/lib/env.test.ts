import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getApiBaseUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SKIP_ENV_VALIDATION = "1";
  });

  afterEach(() => {
    delete process.env.SKIP_ENV_VALIDATION;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("returns empty string for missing or placeholder values", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { getApiBaseUrl } = await import("./env");
    expect(getApiBaseUrl()).toBe("");
  });

  it("strips trailing slash and rejects placeholder strings", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
    const { getApiBaseUrl } = await import("./env");
    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });

  it("treats literal undefined/null string as empty", async () => {
    process.env.NEXT_PUBLIC_API_URL = "undefined";
    const { getApiBaseUrl } = await import("./env");
    expect(getApiBaseUrl()).toBe("");
  });
});

describe("shouldUseMockApi", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SKIP_ENV_VALIDATION = "1";
  });

  afterEach(() => {
    delete process.env.SKIP_ENV_VALIDATION;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_MOCK_API;
  });

  it("is true when NEXT_PUBLIC_API_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { shouldUseMockApi } = await import("./env");
    expect(shouldUseMockApi()).toBe(true);
  });

  it("is false when API URL is set and NEXT_PUBLIC_MOCK_API is off", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    delete process.env.NEXT_PUBLIC_MOCK_API;
    const { shouldUseMockApi } = await import("./env");
    expect(shouldUseMockApi()).toBe(false);
  });

  it("is true when NEXT_PUBLIC_MOCK_API is 1 even if API URL is set", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_MOCK_API = "1";
    const { shouldUseMockApi } = await import("./env");
    expect(shouldUseMockApi()).toBe(true);
  });
});

describe("getTelegramOAuthBotId", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SKIP_ENV_VALIDATION = "1";
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
  });

  it("returns NEXT_PUBLIC_TELEGRAM_BOT_ID when set", async () => {
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID = "999888777";
    const { getTelegramOAuthBotId } = await import("./env");
    expect(getTelegramOAuthBotId()).toBe("999888777");
  });

  it("returns empty when unset (legacy NEXT_PUBLIC_TELEGRAM_BOT_TOKEN fallback removed for security)", async () => {
    const { getTelegramOAuthBotId } = await import("./env");
    expect(getTelegramOAuthBotId()).toBe("");
  });
});
