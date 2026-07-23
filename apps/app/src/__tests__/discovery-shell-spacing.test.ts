import { StyleSheet } from "react-native";
import { describe, expect, it } from "vitest";

import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { createDiscoveryScreenStyles } from "@mobile/screens/discovery/customerDiscoveryStyles";
import { lightColors } from "@mobile/theme/colorPalettes";

/**
 * Directory pages (/brand, /shops, /category, product discovery) render their
 * content inside `desktopContentCap`. It shipped with no top padding and no gap,
 * so the page title sat flush against the sticky header (measured: header bottom
 * 118, content top 118) and each section sat flush against the next (title block
 * ended 230, next section started 230).
 *
 * Founder spec: 40px header→content, 24px between sections.
 */
describe("discovery shell spacing", () => {
  const cap = StyleSheet.flatten(createDiscoveryScreenStyles(lightColors).desktopContentCap);

  it("desktopContentCap > given the desktop directory shell > clears the sticky header by 40px", () => {
    expect(cap.paddingTop).toBe(40);
  });

  it("desktopContentCap > given stacked content sections > separates them by 24px", () => {
    expect(cap.gap).toBe(24);
  });

  it("desktopContentCap > given the spacing values > sources them from layout tokens", () => {
    expect(cap.paddingTop).toBe(mobileShellLayout.desktopDirectoryTopGap);
    expect(cap.gap).toBe(mobileShellLayout.desktopDirectorySectionGap);
  });
});
