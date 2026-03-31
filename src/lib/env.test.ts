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

describe("getTelegramOAuthBotId", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SKIP_ENV_VALIDATION = "1";
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  });

  it("prefers NEXT_PUBLIC_TELEGRAM_BOT_ID when set", async () => {
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID = "999888777";
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN = "111:legacy-secret";
    const { getTelegramOAuthBotId } = await import("./env");
    expect(getTelegramOAuthBotId()).toBe("999888777");
  });

  it("uses numeric prefix from legacy NEXT_PUBLIC_TELEGRAM_BOT_TOKEN", async () => {
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN = "8471948428:AAGSfgmnJp";
    const { getTelegramOAuthBotId } = await import("./env");
    expect(getTelegramOAuthBotId()).toBe("8471948428");
  });

  it("returns empty when unset", async () => {
    const { getTelegramOAuthBotId } = await import("./env");
    expect(getTelegramOAuthBotId()).toBe("");
  });
});
