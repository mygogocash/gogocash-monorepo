import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string): string {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

/**
 * Extract a single flat `styleName: { ... }` block from a StyleSheet.create source.
 * Anchored on a word boundary so `input` does not match `inputBox` / `inputFocused`,
 * and non-greedy up to the first 2-space-indented closing brace.
 */
function styleBlock(file: string, styleName: string): string {
  const match = file.match(new RegExp(`\\b${styleName}: \\{[\\s\\S]*?\\n  \\}`));
  return match?.[0] ?? "";
}

/**
 * Every customer input screen must, on web, suppress the browser's orange OS-accent
 * UA focus outline and convey focus with a brand-green (colors.primary) border instead.
 * This guards against the orange ring creeping back on any of these screens.
 *
 * `inputStyles` = base style(s) that must kill the UA outline.
 * `focusStyle`  = the style toggled on focus that carries the green border.
 */
const INPUT_SCREENS = [
  {
    file: "src/screens/CustomerMyCashbackSignInScreen.tsx",
    inputStyles: ["input"],
    focusStyle: "inputFocused",
  },
  {
    file: "src/screens/CustomerAgeVerificationScreen.tsx",
    inputStyles: ["input"],
    focusStyle: "inputFocused",
  },
  {
    file: "src/screens/CustomerGoLinkScreen.tsx",
    // Focus border lives on the rounded inputShell wrapper (the inner <input> is borderless), so the
    // brand-green border actually shows — and follows the clipped rounded box, like ProfileInfoPanel.
    inputStyles: ["input"],
    focusStyle: "inputShellFocused",
  },
  {
    file: "src/screens/CustomerProfilePhoneScreen.tsx",
    inputStyles: ["input", "otpInput"],
    focusStyle: "inputFocused",
  },
  {
    file: "src/screens/CustomerMoneyActionScreen.tsx",
    inputStyles: ["textInput"],
    focusStyle: "inputFocused",
  },
  {
    file: "src/components/ProfileInfoPanel.tsx",
    inputStyles: ["textInput"],
    // Focus border lives on the rounded wrapper (inputBoxFocused), not the square inner input —
    // so the brand-green border follows the box and the rounded corners stay clean.
    focusStyle: "inputBoxFocused",
  },
] as const;

describe("input focus parity", () => {
  for (const screen of INPUT_SCREENS) {
    describe(screen.file, () => {
      const file = readMobileFile(screen.file);

      it.each(screen.inputStyles)(
        "input style %s > given web focus > then the orange UA outline is suppressed",
        (styleName) => {
          const block = styleBlock(file, styleName);
          expect(block, `${styleName} style block`).not.toBe("");
          expect(block).toContain('outlineColor: "transparent"');
          expect(block).toContain("outlineWidth: 0");
        },
      );

      it("focus style > given the focused state > then it uses the brand-green colors.primary border", () => {
        const block = styleBlock(file, screen.focusStyle);
        expect(block, `${screen.focusStyle} style block`).not.toBe("");
        expect(block).toContain("borderColor: colors.primary");
      });

      it("focus style > given an input > then the green border is applied conditionally on focus", () => {
        expect(file).toContain(`? styles.${screen.focusStyle} :`);
      });
    });
  }
});

/**
 * When the rounded border + radius live on a <div> WRAPPER (not the focusable <input>), the wrapper
 * defaults to overflow:visible on web, so the rounded corners rasterize "horns" under the browser's
 * focus compositing layer (same root cause + fix as ProfileInfoPanel inputBox/dropdownBox). The fix
 * is overflow:hidden so the box clips to its radius. The border-on-the-<input> screens above are
 * exempt: react-native-web's <input> already computes overflow:clip and cannot horn.
 */
const WRAPPER_CLIP_FIELD_STYLES = [
  { file: "src/screens/CustomerGoLinkScreen.tsx", styleName: "inputShell" },
  { file: "src/screens/CustomerMoneyActionScreen.tsx", styleName: "inputBox" },
  // App-wide sweep (search boxes + the withdraw select bar) — same rounded-wrapper structure.
  { file: "src/components/CustomerDesktopHeader.tsx", styleName: "desktopHeaderSearch" },
  { file: "src/screens/CustomerHomeScreen.tsx", styleName: "searchPill" },
  { file: "src/screens/CustomerHomeScreen.tsx", styleName: "desktopGoLinkInputShell" },
  { file: "src/screens/CustomerDiscoveryScreen.tsx", styleName: "shopDirectorySearchBox" },
  { file: "src/screens/CustomerDiscoveryScreen.tsx", styleName: "productDiscoverySearchBox" },
  { file: "src/screens/CustomerDiscoveryScreen.tsx", styleName: "categorySearchBox" },
  { file: "src/screens/CustomerCategoryDetailScreen.tsx", styleName: "searchBox" },
  { file: "src/screens/CustomerMoneyActionScreen.tsx", styleName: "selectBar" },
] as const;

describe("rounded input wrappers clip to their radius (no focus-corner horns)", () => {
  for (const { file, styleName } of WRAPPER_CLIP_FIELD_STYLES) {
    it(`${file} > ${styleName} > given a rounded wrapper > then it clips to its radius (overflow hidden)`, () => {
      const block = styleBlock(readMobileFile(file), styleName);
      expect(block, `${styleName} style block in ${file}`).not.toBe("");
      expect(block).toContain('overflow: "hidden"');
    });
  }
});

// GoLink's inputShell carries both the focus border (inputShellFocused) and the validation-error
// border (inputShellError). The error must win when a field is both focused and errored, which on
// react-native-web means inputShellError is applied AFTER inputShellFocused in the style array.
describe("CustomerGoLinkScreen.tsx > inputShell focus vs error precedence", () => {
  const file = readMobileFile("src/screens/CustomerGoLinkScreen.tsx");

  it("focus border > given focus > then it lives on the rounded inputShell wrapper", () => {
    expect(file).toContain("? styles.inputShellFocused :");
    expect(styleBlock(file, "inputShellFocused")).toContain("borderColor: colors.primary");
  });

  it("error border > given both focus and error > then error wins (applied after focus)", () => {
    const focusIdx = file.indexOf("styles.inputShellFocused");
    const errorIdx = file.indexOf("styles.inputShellError");
    expect(focusIdx, "styles.inputShellFocused reference").toBeGreaterThan(-1);
    expect(errorIdx, "styles.inputShellError reference").toBeGreaterThan(-1);
    expect(errorIdx).toBeGreaterThan(focusIdx);
  });
});
