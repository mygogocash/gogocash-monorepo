import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Wave 3 (Agent D) source-parity suite for the new profile hero. ProfileHeroCard is
// the Expo port of the web `CardProfile` (src/features/profile/component/CardProfile.tsx):
// avatar + name + GOGOPASS badge, a "User ID" row with a copy button, and a mint
// "invite link" chip with a copy button. The hero pulls its label/value/a11y strings
// from the shared `webProfileHeroCard` constant and copies via the cross-platform
// `copyToClipboard`, surfacing a toast on success/failure. This is a source-read suite
// (the repo idiom for parity coverage) — it asserts the component wires those pieces
// up, not pixel output (the render suite proves it mounts).
const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Customer profile hero parity (web CardProfile)", () => {
  it("hero constant > given the shared webProfileHeroCard mock > then it carries the User ID + invite-link labels, values, and copy a11y strings", () => {
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("export const webProfileHeroCard");
    // User ID row: label, the mock 9-digit display value, copy a11y label + success toast.
    expect(designFile).toContain('userIdLabel: "User ID"');
    expect(designFile).toContain('userId: "204815963"');
    expect(designFile).toContain('userIdCopyAria: "Copy User ID"');
    expect(designFile).toContain('userIdCopiedToast: "User ID copied"');
    // Invite-link chip: label, copy a11y label + success toast, and the value reuses
    // the referral page's displayLink so the hero and referral page can't drift.
    expect(designFile).toContain('inviteLinkLabel: "invite link"');
    expect(designFile).toContain("inviteLink: webReferralPage.earn.displayLink");
    expect(designFile).toContain('inviteLinkCopyAria: "Copy invite link"');
    expect(designFile).toContain('inviteLinkCopiedToast: "Invite link copied"');
    expect(designFile).toContain('copyFailedToast: "Copy failed. Please try again."');
  });

  it("hero card > given the User ID row > then it renders the id, a copy button, and copies via copyToClipboard", () => {
    const heroFile = readMobileFile("src/components/ProfileHeroCard.tsx");

    // Reuses the shared constant rather than re-declaring copy.
    expect(heroFile).toContain("webProfileHeroCard");
    expect(heroFile).toContain('from "@mobile/design/webDesignParity"');
    // User ID label + value rendered from the constant.
    expect(heroFile).toContain("webProfileHeroCard.userIdLabel");
    expect(heroFile).toContain("webProfileHeroCard.userId");
    // A copy button with the a11y label, calling the cross-platform clipboard helper.
    expect(heroFile).toContain("webProfileHeroCard.userIdCopyAria");
    expect(heroFile).toContain("webProfileHeroCard.userIdCopiedToast");
    expect(heroFile).toContain('from "@mobile/lib/clipboard"');
    expect(heroFile).toContain("copyToClipboard(");
    // Copy affordance is an accessible button.
    expect(heroFile).toContain('accessibilityRole="button"');
  });

  it("hero card > given the invite link > then it renders the link, a copy button, and surfaces a toast", () => {
    const heroFile = readMobileFile("src/components/ProfileHeroCard.tsx");

    expect(heroFile).toContain("webProfileHeroCard.inviteLinkLabel");
    expect(heroFile).toContain("webProfileHeroCard.inviteLink");
    expect(heroFile).toContain("webProfileHeroCard.inviteLinkCopyAria");
    expect(heroFile).toContain("webProfileHeroCard.inviteLinkCopiedToast");
    // Copy feedback goes through the toast hook (success/failure message).
    expect(heroFile).toContain('from "@mobile/hooks/useToast"');
    expect(heroFile).toContain("useToast(");
    expect(heroFile).toContain(".show(");
    // Failure path uses the shared failure copy.
    expect(heroFile).toContain("webProfileHeroCard.copyFailedToast");
  });

  it("hero card > given the identity block > then it renders the GoGoPass badge and the display-only avatar", () => {
    const heroFile = readMobileFile("src/components/ProfileHeroCard.tsx");

    // GOGOPASS badge (web CardProfile parity) — imported and rendered.
    expect(heroFile).toContain('from "@mobile/components/GoGoPassBadge"');
    expect(heroFile).toContain("<GoGoPassBadge");
    // Avatar is display-only (no upload, per the plan): the GoGoPass ring avatar wraps
    // the static profile image asset.
    expect(heroFile).toContain('from "@mobile/components/GoGoPassAvatar"');
    expect(heroFile).toContain("<GoGoPassAvatar");
    expect(heroFile).toContain("profileAvatarImage");
  });

  it("shared panel > given the rich profile panel > then it composes the hero above the cashback + personal sections", () => {
    // The hero is mounted by the shared ProfileInfoPanel (used by both /profile desktop
    // and /profile/info), so a refactor that drops it from the panel is caught here.
    const panelFile = readMobileFile("src/components/ProfileInfoPanel.tsx");

    expect(panelFile).toContain('from "@mobile/components/ProfileHeroCard"');
    expect(panelFile).toContain("<ProfileHeroCard");
  });
});
