import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isInvolveXtraShopsEnabled,
  resolveInvolveXtraShopsEnabled,
} from "@mobile/config/featureFlags";

// #586 — Involve Commission Xtra shops rollout flag. Same "only the literal '0'
// hides it" contract as the other EXPO_PUBLIC_ENABLE_* flags, but pinned OFF on
// beta (eas.json) and defaulted OFF in the web Dockerfile ARG so the surface
// stays dark until the Involve Publisher API key (Shopee TH) is approved.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const readMobileFile = (p: string) =>
  fs.readFileSync(path.join(mobileRoot, p), "utf8");

describe("resolveInvolveXtraShopsEnabled", () => {
  it('unset -> enabled; "0" -> hidden; other strings -> enabled', () => {
    expect(resolveInvolveXtraShopsEnabled(undefined)).toBe(true);
    expect(resolveInvolveXtraShopsEnabled("0")).toBe(false);
    expect(resolveInvolveXtraShopsEnabled("1")).toBe(true);
    expect(resolveInvolveXtraShopsEnabled("")).toBe(true);
  });
});

describe("isInvolveXtraShopsEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("unset -> true", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS;
    expect(isInvolveXtraShopsEnabled()).toBe(true);
  });

  it('"0" -> false', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS", "0");
    expect(isInvolveXtraShopsEnabled()).toBe(false);
  });
});

describe("involve-xtra flag wiring (source-pinned; stays dark until creds)", () => {
  it("the web Dockerfile declares the build arg defaulted to 0", () => {
    expect(readMobileFile("Dockerfile.web.railway")).toContain(
      "ARG EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS=0",
    );
  });

  it('eas.json beta profile pins the flag to "0"', () => {
    const eas = JSON.parse(readMobileFile("eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    expect(eas.build.beta.env?.EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS).toBe("0");
  });

  it("the shop directory screen gates the Xtra source behind the flag", () => {
    const s = readMobileFile(
      "src/screens/discovery/CustomerShopDirectoryScreen.tsx",
    );
    expect(s).toContain("isInvolveXtraShopsEnabled");
    expect(s).toContain("mapExploreShopsToDirectoryStores");
  });
});
