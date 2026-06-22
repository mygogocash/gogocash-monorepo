import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

import {
  readStoredThemePreference,
  readStoredThemePreferenceSync,
  writeStoredThemePreference,
} from "@mobile/theme/themePreferenceStorage";

describe("theme preference storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("web sync read > given stored dark > then returns dark", () => {
    const localStorageMock = {
      getItem: vi.fn(() => "dark"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    expect(readStoredThemePreferenceSync()).toBe("dark");
  });

  it("web async write > given light > then persists to localStorage", async () => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    await writeStoredThemePreference("light");

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "gogocash.theme.preference",
      "light"
    );
  });

  it("web async read > given stored system > then returns system", async () => {
    const localStorageMock = {
      getItem: vi.fn(() => "system"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageMock);

    await expect(readStoredThemePreference()).resolves.toBe("system");
  });
});
