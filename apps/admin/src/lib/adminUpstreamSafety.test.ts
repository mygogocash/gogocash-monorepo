import { afterEach, describe, expect, it } from "vitest";

import {
  isRailwayRuntime,
  isUnsafePublicAdminUpstream,
  resolveAdminUpstream,
} from "./adminUpstreamSafety";

describe("isUnsafePublicAdminUpstream", () => {
  it("allows private Railway and localhost upstreams", () => {
    expect(
      isUnsafePublicAdminUpstream("http://gogocash-api.railway.internal:8080"),
    ).toBe(false);
    expect(isUnsafePublicAdminUpstream("http://localhost:8080")).toBe(false);
    expect(isUnsafePublicAdminUpstream("http://127.0.0.1:8080")).toBe(false);
  });

  it("rejects public Railway proxy and GoGoCash API custom domains", () => {
    expect(
      isUnsafePublicAdminUpstream(
        "https://gogocash-api-production.up.railway.app",
      ),
    ).toBe(true);
    expect(isUnsafePublicAdminUpstream("https://api-beta.gogocash.co")).toBe(
      true,
    );
    expect(
      isUnsafePublicAdminUpstream("https://api-staging.gogocash.co/"),
    ).toBe(true);
    expect(isUnsafePublicAdminUpstream("https://api.gogocash.co")).toBe(true);
  });
});

describe("resolveAdminUpstream", () => {
  const keys = [
    "API_URL",
    "NEXT_PUBLIC_API_URL",
    "RAILWAY_ENVIRONMENT",
    "RAILWAY_SERVICE_NAME",
    "RAILWAY_PROJECT_ID",
  ] as const;
  const original = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    for (const key of keys) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("given Railway without API_URL > then fails closed (no public fallback)", () => {
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api-beta.gogocash.co";
    process.env.RAILWAY_ENVIRONMENT = "production";

    expect(isRailwayRuntime()).toBe(true);
    expect(resolveAdminUpstream()).toMatchObject({
      ok: false,
      code: "ADMIN_UPSTREAM_MISSING",
      reason: expect.stringContaining("API_URL is required on Railway"),
    });
  });

  it("given Railway with private API_URL > then accepts it", () => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    process.env.API_URL = "http://gogocash-api.railway.internal:8080";
    process.env.NEXT_PUBLIC_API_URL = "https://api-beta.gogocash.co";

    expect(resolveAdminUpstream()).toEqual({
      ok: true,
      url: "http://gogocash-api.railway.internal:8080",
    });
  });

  it("given API_URL on *.up.railway.app > then rejects as unsafe public upstream", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_SERVICE_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    process.env.API_URL = "https://gogocash-api-production.up.railway.app";
    process.env.NEXT_PUBLIC_API_URL = "https://api-beta.gogocash.co";

    expect(resolveAdminUpstream()).toMatchObject({
      ok: false,
      code: "ADMIN_UPSTREAM_UNSAFE_PUBLIC",
    });
  });

  it("given local without API_URL > then allows NEXT_PUBLIC_API_URL fallback", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_SERVICE_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080/";

    expect(resolveAdminUpstream()).toEqual({
      ok: true,
      url: "http://localhost:8080",
    });
  });
});
