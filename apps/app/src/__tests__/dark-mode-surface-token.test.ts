import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readDiscoverySources } from "../test-support/discoverySource";
import { readHomeSources } from "../test-support/homeSource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "..", "..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

const phaseTwoScreenFiles = [
  "src/screens/CustomerCreditScoreScreen.tsx",
  "src/screens/CustomerGoLinkScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/screens/CustomerQuestScreen.tsx",
  "src/screens/CustomerReferralScreen.tsx",
  "src/screens/CustomerShopDetailScreen.tsx",
  "src/screens/CustomerWithdrawMethodScreen.tsx",
];

const phaseThreeScreenFiles = [
  "src/screens/CustomerHomeScreen.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/NativeParityScreen.tsx",
];

function readPhaseThreeSource(relativePath: string) {
  if (relativePath === "src/screens/CustomerDiscoveryScreen.tsx") {
    return readDiscoverySources(mobileRoot);
  }
  if (relativePath === "src/screens/CustomerHomeScreen.tsx") {
    return readHomeSources(mobileRoot);
  }
  return readMobileFile(relativePath);
}

const phaseFourComponentFiles = ["src/components/ShopRedirectOverlay.tsx"];

const unthemedLightSurfacePatterns = [
  /backgroundColor:\s*"#F7FDFB"/,
  /backgroundColor:\s*"#F0FDFA"/,
  /backgroundColor:\s*"#F6FDFB"/,
  /backgroundColor:\s*"#FEF3C7"/,
  /backgroundColor:\s*"#E4E4E4"/,
  /borderColor:\s*"#EFEFEF"/,
  /borderColor:\s*"#E6F7ED"/,
  /borderColor:\s*"#C8EBE0"/,
  /borderColor:\s*"#B8D4EF"/,
];

const unthemedWhiteBackgroundLine =
  /backgroundColor:\s*"rgba\(255,\s*255,\s*255,/;

const unthemedLightHexBackgroundLine =
  /backgroundColor:\s*"#F[A-F0-9]{5}"/;

function findUnthemedBackgroundLines(
  source: string,
  pattern: RegExp,
): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => pattern.test(line) && !line.includes("pickThemed("));
}

describe("dark mode Phase 2 surface tokens", () => {
  it.each(phaseTwoScreenFiles)(
    "%s does not keep unthemed light-only card/status surfaces",
    (relativePath) => {
      const source = readMobileFile(relativePath);

      for (const pattern of unthemedLightSurfacePatterns) {
        expect(source, `${relativePath} contains ${pattern}`).not.toMatch(
          pattern,
        );
      }

      expect(
        findUnthemedBackgroundLines(source, unthemedWhiteBackgroundLine),
        `${relativePath} has unthemed white backgroundColor literals`,
      ).toEqual([]);
    },
  );

  it.each([...phaseThreeScreenFiles, ...phaseFourComponentFiles, "src/screens/CustomerDiscoveryScreen.tsx"])(
    "%s does not keep unthemed white frosted control surfaces",
    (relativePath) => {
      const source = readPhaseThreeSource(relativePath);

      expect(
        findUnthemedBackgroundLines(source, unthemedWhiteBackgroundLine),
        `${relativePath} has unthemed white backgroundColor literals`,
      ).toEqual([]);
    },
  );

  it.each([...phaseThreeScreenFiles, "src/screens/CustomerDiscoveryScreen.tsx"])(
    "%s does not keep unthemed light mint popover/card hex backgrounds",
    (relativePath) => {
      const source = readPhaseThreeSource(relativePath);

      expect(
        findUnthemedBackgroundLines(source, unthemedLightHexBackgroundLine),
        `${relativePath} has unthemed #F* backgroundColor literals`,
      ).toEqual([]);
    },
  );
});
