import { describe, expect, it } from "vitest";

import { resolveLocaleGlobeColor } from "@mobile/theme/localeGlobeColor";
import { darkColors, lightColors } from "@mobile/theme/colorPalettes";

describe("resolveLocaleGlobeColor", () => {
  it("closed > given dark chrome > then uses high-contrast white ink", () => {
    expect(resolveLocaleGlobeColor(darkColors, false)).toBe(darkColors.white);
  });

  it("closed > given light chrome > then uses accent ink", () => {
    expect(resolveLocaleGlobeColor(lightColors, false)).toBe(lightColors.accent);
  });

  it("open > then uses primary in either theme", () => {
    expect(resolveLocaleGlobeColor(lightColors, true)).toBe(lightColors.primary);
    expect(resolveLocaleGlobeColor(darkColors, true)).toBe(darkColors.primary);
  });
});
