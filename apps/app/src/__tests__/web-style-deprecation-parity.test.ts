import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

function normalizeSource(source: string) {
  return source.replace(/\s+/g, " ");
}

// react-native-web (0.21) deprecates the per-prop shadow* / textShadow* style props
// in favor of the CSS `boxShadow` / `textShadow` shorthands, and logs a console warning
// for each deprecated prop it processes. RN core (native) still uses the per-prop form,
// so the cross-platform pattern is:
//   - shadow*    -> use the boxShadow token string (works on web AND native in RN 0.85)
//   - textShadow* -> Platform.select: web shorthand string, native keeps textShadow*
// These guards keep the Expo-web console free of those deprecation warnings.
describe("react-native-web style deprecation warnings stay fixed", () => {
  it("Toast > given the toast surface > then it uses the boxShadow token, not a spread of the deprecated shadow* object", () => {
    const toast = readMobileFile("src/components/Toast.tsx");
    expect(toast).toContain("boxShadow: shadows.cardCss");
    // Spreading the native shadow* object (`...shadows.card`) re-introduces the
    // "shadow* style props are deprecated" warning on react-native-web.
    expect(toast).not.toContain("...shadows.card");
    expect(toast).not.toContain("...shadows.bottomNav");
  });

  it("non-interactive overlays > given customer UI sources > then pointerEvents lives in style, not the deprecated prop", () => {
    // react-native-web 0.21 deprecates `pointerEvents` as a PROP (logs "props.pointerEvents
    // is deprecated. Use style.pointerEvents"). RN 0.85 supports `style.pointerEvents` on web
    // AND native, so the cross-platform fix moves it into the style object.
    const srcRoot = path.join(mobileRoot, "src");
    const files: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "test-support") {
            continue;
          }
          walk(fullPath);
          continue;
        }
        if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
          files.push(fullPath);
        }
      }
    }

    walk(srcRoot);

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, `${path.relative(mobileRoot, file)} must not pass pointerEvents as a prop`).not.toMatch(
        /pointerEvents=/
      );
    }

    for (const file of ["src/components/Toast.tsx", "src/security/PrivacyScreenGuard.tsx"]) {
      const source = readMobileFile(file);
      expect(source, `${file} must keep the non-interactive intent in style`).toContain(
        'pointerEvents: "none"'
      );
    }
  });

  it("profile popover hero name > given the user name shadow > then textShadow is branched per platform (web shorthand, native textShadow*)", () => {
    const menu = readMobileFile("src/components/CustomerProfileMenu.tsx");
    const normalized = normalizeSource(menu);
    // Web receives the CSS `textShadow` shorthand (warning-free on react-native-web).
    expect(normalized).toContain(
      'web: { textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)" }'
    );
    // The deprecated per-prop form must live inside Platform.select's native branch
    // (so it is never emitted on web), not applied unconditionally.
    expect(normalized).toContain("Platform.select");
    expect(normalized).toContain("textShadowColor:");
  });
});
