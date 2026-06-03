import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Source-signal parity for the Privacy Policy legal page (/privacy-policy), which previously
// had NO test. A full render-mount isn't practical under the happy-dom render harness — the
// markdown legal chain pulls in RN internals (EventEmitter) not available there — but the
// screen IS verified live (desktop + mobile). These assertions lock that its legal copy +
// dates come from the shared parity sources (webPrivacyPolicyPage + privacyPolicyMarkdown)
// and that it renders inside the standard app shell, matching the Next.js privacy-policy page.
const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) => readFileSync(resolve(mobileRoot, relativePath), "utf8");
const screenSource = read("src/screens/CustomerPrivacyPolicyScreen.tsx");
const designSource = read("src/design/webDesignParity.ts");

describe("Privacy Policy page parity (/privacy-policy)", () => {
  it("draws its legal copy from the shared parity module + markdown source (not inline strings)", () => {
    expect(screenSource).toContain("webPrivacyPolicyPage");
    expect(screenSource).toContain("privacyPolicyMarkdown");
  });

  it("renders inside the standard app shell (header + bottom nav + scrollable article)", () => {
    expect(screenSource).toContain("CustomerDesktopHeader");
    expect(screenSource).toContain("CustomerMobileBottomNav");
    expect(screenSource).toContain("ScrollView");
  });

  it("keeps the PDPA legal metadata in webDesignParity", () => {
    expect(designSource).toContain('articleLabel: "Privacy Policy"');
    expect(designSource).toContain('effectiveDate: "Effective Date: 1 April 2026"');
    expect(designSource).toContain('openingCompany: "GOGO HOLDING (THAILAND) Company Limited"');
    expect(designSource).toContain(
      'intentIntro: "This Privacy Policy is intended to help you understand:"',
    );
  });
});
