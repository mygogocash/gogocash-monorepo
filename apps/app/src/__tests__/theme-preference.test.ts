import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_PREFERENCE,
  parseThemePreference,
  type ThemePreference,
} from "@mobile/theme/themePreference";
import { resolveTheme } from "@mobile/theme/resolveTheme";

describe("parseThemePreference", () => {
  it("given null > then defaults to system", () => {
    expect(parseThemePreference(null)).toBe("system");
  });

  it("given invalid value > then defaults to system", () => {
    expect(parseThemePreference("auto")).toBe("system");
    expect(parseThemePreference("")).toBe("system");
  });

  it("given explicit preference > then returns it", () => {
    const values: ThemePreference[] = ["system", "light", "dark"];
    for (const value of values) {
      expect(parseThemePreference(value)).toBe(value);
    }
  });
});

describe("DEFAULT_THEME_PREFERENCE", () => {
  it("is system", () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("given light preference > then resolves light regardless of system", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("light", "light")).toBe("light");
    expect(resolveTheme("light", null)).toBe("light");
  });

  it("given dark preference > then resolves dark regardless of system", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("dark", "dark")).toBe("dark");
    expect(resolveTheme("dark", null)).toBe("dark");
  });

  it("given system preference > then follows system scheme", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
  });

  it("given system preference and unknown system > then defaults to light", () => {
    expect(resolveTheme("system", null)).toBe("light");
  });
});
