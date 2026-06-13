import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { typography } from "@mobile/theme/tokens";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const repoRoot = path.resolve(mobileRoot, "../..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

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

  it("typography parity > given Next font contract > then Expo loads matching web and native font families", () => {
    const nextFonts = readRepoFile("src/lib/fonts.ts");
    const nextGlobals = readRepoFile("src/app/globals.css");
    const mobileHtml = readMobileFile("public/index.html");
    const mobileConfig = readMobileFile("app.config.ts");
    const providers = readMobileFile("src/providers/AppProviders.tsx");
    const packageJson = readMobileFile("package.json");

    expect(nextFonts).toContain('DM_Sans');
    expect(nextFonts).toContain('Anuphan');
    expect(nextGlobals).toContain('body.locale-en');
    expect(nextGlobals).toContain('body.locale-th');
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
