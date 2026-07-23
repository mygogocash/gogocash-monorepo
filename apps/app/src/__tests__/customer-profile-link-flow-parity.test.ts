import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The profile link/unlink placeholders must use the SAME flow as the Next.js web app
// (src/features/profile/component/ProfileDesktopPersonalPanel.tsx): social Link and the
// MyCashBack Unlink both fire toast(t("authFeatureComingSoon")); the "Link your account
// here" CTA routes to /link-mycashback. Locking the exact catalog copy means tc() reverse-
// looks up the same key (so Thai resolves) instead of a bespoke English-only string.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const read = (rel: string): string => fs.readFileSync(path.join(mobileRoot, rel), "utf8");

describe("Profile link sections — same coming-soon flow as the Next.js web app", () => {
  const panel = read("src/components/ProfileInfoPanel.tsx");
  // Base catalogs live in the shared package since #19 (P4-2); overlays stay app-local.
  const enCatalog = JSON.parse(
    read("../../packages/i18n/messages/en.json"),
  ) as Record<string, string>;
  const comingSoon = enCatalog.authFeatureComingSoon;

  it("link flow > given Link/Unlink placeholders > then fires the web's authFeatureComingSoon toast copy", () => {
    expect(comingSoon).toBeTruthy();
    // Web parity: tc(<exact authFeatureComingSoon value>) → reverse-lookup resolves key + Thai.
    expect(panel).toContain(`tc("${comingSoon}")`);
    // No bespoke/guessed string that would bypass the catalog and ship English-only.
    expect(panel).not.toContain("This feature is coming soon");
  });

  it("link flow > given the MyCashBack CTA > then routes to /link-mycashback (web parity)", () => {
    expect(panel).toContain('href="/link-mycashback"');
  });

  // Issue #411: Link Email / Phone must seed from session identity helpers, not hardcoded mocks.
  it("link contact fields > given Personal Information > then seeds email/phone via profileIdentity (no hardcoded mocks)", () => {
    expect(panel).toContain("resolveProfileEmail");
    expect(panel).toContain("resolveProfilePhone");
    expect(panel).not.toContain('useState("mock.user@gogocash.test")');
    expect(panel).not.toContain('useState("+66123456789")');
  });
});
