import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { typography } from "@mobile/theme/tokens";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

function collectSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      return [];
    }

    return [entryPath];
  });
}

describe("Expo typography parity", () => {
  it("typography parity > given the Next text scale > then Expo exposes matching shared tokens", () => {
    expect(typography).toMatchObject({
      action: 15,
      actionLineHeight: 20,
      actionWeight: "700",
      body: 15,
      bodyLineHeight: 23,
      bodyWeight: "400",
      caption: 12,
      captionLineHeight: 16,
      captionWeight: "400",
      label: 14,
      labelLineHeight: 20,
      labelWeight: "500",
      letterSpacing: 0,
      pageTitle: 32,
      pageTitleLineHeight: 40,
      pageTitleWeight: "600",
      title: 20,
      titleLineHeight: 28,
      titleWeight: "600",
    });
  });

  it("typography parity > given the font contract > then Expo loads matching web and native font families", () => {
    // The legacy Next customer web (src/lib/fonts.ts + src/app/globals.css) was
    // retired. The font contract now lives entirely in the Expo app: the runtime
    // font registry (appFonts.ts) is the native source of truth, the locale
    // mechanism moved to the html lang attribute, and the web/native families are
    // still pinned by the shared tokens, the web index.html, and app.config.js.
    const appFonts = readMobileFile("src/theme/appFonts.ts");
    const mobileHtml = readMobileFile("public/index.html");
    const mobileConfig = readMobileFile("app.config.js");
    const providers = readMobileFile("src/providers/AppProviders.tsx");
    const packageJson = readMobileFile("package.json");

    // Native runtime registers both families under the names the styles reference.
    expect(appFonts).toContain('"DM Sans": DMSans_400Regular');
    expect(appFonts).toContain("Anuphan: Anuphan_400Regular");
    // Web locale switching is driven by the html lang attribute (replaces the
    // retired body.locale-en / body.locale-th globals.css classes).
    expect(mobileHtml).toContain('<html lang="%LANG_ISO_CODE%">');
    expect(typography).toMatchObject({
      family: '"DM Sans", Anuphan, system-ui, sans-serif',
      thaiFamily: 'Anuphan, "DM Sans", system-ui, sans-serif',
    });
    expect(packageJson).toContain('"@expo-google-fonts/dm-sans"');
    expect(packageJson).toContain('"@expo-google-fonts/anuphan"');
    expect(mobileHtml).toContain('family=Anuphan:wght@400;500;600;700');
    expect(mobileHtml).toContain('family=DM+Sans:wght@400;500;600;700;800;900');
    expect(mobileHtml).toContain('font-family: "DM Sans", Anuphan, system-ui, sans-serif');
    expect(mobileHtml).toContain("font: inherit");
    expect(mobileHtml).toContain("text-decoration: none");
    expect(mobileConfig).toContain('fontFamily: "DM Sans"');
    expect(mobileConfig).toContain('fontFamily: "Anuphan"');
    expect(mobileConfig).toContain("DMSans_900Black.ttf");
    expect(mobileConfig).toContain("Anuphan_700Bold.ttf");
    expect(providers).toContain("useFonts(gogoCashRuntimeFonts)");
  });

  it("typography parity > given Expo text styles > then no text style uses negative letter spacing", () => {
    const offenders = collectSourceFiles(path.join(mobileRoot, "src"))
      .flatMap((filePath) =>
        fs
          .readFileSync(filePath, "utf8")
          .split("\n")
          .map((line, index) => ({ filePath, index, line }))
      )
      .filter(({ line }) => /letterSpacing:\s*-\d/.test(line))
      .map(({ filePath, index, line }) => {
        const relativePath = path.relative(mobileRoot, filePath);
        return `${relativePath}:${index + 1}: ${line.trim()}`;
      });

    expect(offenders).toEqual([]);
  });

  it("typography parity > given the Next font-weight range > then Expo customer styles do not use black 900 text", () => {
    const offenders = collectSourceFiles(path.join(mobileRoot, "src"))
      .flatMap((filePath) =>
        fs
          .readFileSync(filePath, "utf8")
          .split("\n")
          .map((line, index) => ({ filePath, index, line }))
      )
      .filter(({ line }) => /fontWeight:\s*"900"/.test(line))
      .map(({ filePath, index, line }) => {
        const relativePath = path.relative(mobileRoot, filePath);
        return `${relativePath}:${index + 1}: ${line.trim()}`;
      });

    expect(offenders).toEqual([]);
  });
});
