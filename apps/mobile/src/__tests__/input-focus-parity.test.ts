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
    inputStyles: ["input"],
    focusStyle: "inputFocused",
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
