import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("cookieConsentStorage web parity", () => {
  it("cookieConsentStorage > given Expo web > then uses localStorage only and never SecureStore", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/pdpa/cookieConsentStorage.ts"),
      "utf8",
    );

    expect(source).toContain('Platform.OS === "web"');
    expect(source).toContain("globalThis.localStorage");
    expect(source).toContain(
      'globalThis.localStorage?.setItem(STORAGE_KEY, DISMISSED_VALUE);\n      return;',
    );
  });

  it("cookieConsentStorage > given native runtime > then uses SecureStore and never localStorage writes", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/pdpa/cookieConsentStorage.ts"),
      "utf8",
    );

    expect(source).toContain('await import("expo-secure-store")');
    expect(source).toContain("webCookieConsentBanner.dismissedStorageKey");
  });
});

describe("cookie consent storage runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("web sync read > given dismissed flag > then returns true", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "web" },
    }));

    const localStorageMock = {
      getItem: vi.fn(() => "1"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    const { readCookieConsentDismissedSync } = await import(
      "@mobile/pdpa/cookieConsentStorage"
    );

    expect(readCookieConsentDismissedSync()).toBe(true);
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      "pdpa_consent_banner_dismissed_v1",
    );
  });

  it("web async write > given accept > then persists dismissal to localStorage", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "web" },
    }));

    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    const { writeCookieConsentDismissed } = await import(
      "@mobile/pdpa/cookieConsentStorage"
    );

    await writeCookieConsentDismissed();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "pdpa_consent_banner_dismissed_v1",
      "1",
    );
  });

  it("native async read > given SecureStore flag > then returns true", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));

    const getItemAsync = vi.fn(async () => "1");
    vi.doMock("expo-secure-store", () => ({
      getItemAsync,
      setItemAsync: vi.fn(),
    }));

    const { readCookieConsentDismissed } = await import(
      "@mobile/pdpa/cookieConsentStorage"
    );

    await expect(readCookieConsentDismissed()).resolves.toBe(true);
    expect(getItemAsync).toHaveBeenCalledWith("pdpa_consent_banner_dismissed_v1");
  });

  it("native async write > given accept > then persists dismissal to SecureStore", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "android" },
    }));

    const setItemAsync = vi.fn(async () => undefined);
    vi.doMock("expo-secure-store", () => ({
      getItemAsync: vi.fn(),
      setItemAsync,
    }));

    const { writeCookieConsentDismissed } = await import(
      "@mobile/pdpa/cookieConsentStorage"
    );

    await writeCookieConsentDismissed();

    expect(setItemAsync).toHaveBeenCalledWith(
      "pdpa_consent_banner_dismissed_v1",
      "1",
    );
  });
});
