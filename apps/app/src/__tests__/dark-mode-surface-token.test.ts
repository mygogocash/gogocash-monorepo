import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
];

const unthemedLightSurfacePatterns = [
  /backgroundColor:\s*"#F7FDFB"/,
  /backgroundColor:\s*"#F0FDFA"/,
  /backgroundColor:\s*"#F6FDFB"/,
  /backgroundColor:\s*"#FEF3C7"/,
  /backgroundColor:\s*"#E4E4E4"/,
  /backgroundColor:\s*"rgba\(255,\s*255,\s*255,/,
  /borderColor:\s*"#EFEFEF"/,
  /borderColor:\s*"#E6F7ED"/,
  /borderColor:\s*"#C8EBE0"/,
  /borderColor:\s*"#B8D4EF"/,
];

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
    },
  );
});
