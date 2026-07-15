import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("axios client baseURL", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("given NEXT_PUBLIC_API_URL > then uses same-origin BFF base", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    const { default: client } = await import("./client");
    expect(client.defaults.baseURL).toBe("/api/backend");
  });

  it("given no real API URL > then uses mock base", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { default: client } = await import("./client");
    expect(client.defaults.baseURL).toBe("/api/mock");
  });

  it("given a whitespace-only API URL > then uses mock base", async () => {
    process.env.NEXT_PUBLIC_API_URL = "   ";
    const { default: client } = await import("./client");
    expect(client.defaults.baseURL).toBe("/api/mock");
  });
});
