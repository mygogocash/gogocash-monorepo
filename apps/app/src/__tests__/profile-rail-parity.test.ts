import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("desktop profile rail parity", () => {
  it("shell > given a profile-section route on desktop > then it renders the persistent rail driven by pathname", () => {
    const shell = readMobileFile("src/components/AccountPageShell.tsx");

    // The rail shows on ALL profile-section routes (by pathname), not just the
    // hub screens that opt in via showProfileRail.
    expect(shell).toContain("isProfileSectionPath");
    expect(shell).toContain("usePathname");
    expect(shell).toContain("showDesktopRail");
    expect(shell).toContain("<DesktopProfileRail />");
  });

  it("rail > given the menu > then it renders the full web menu, the Profile accordion, and Log Out", () => {
    const shell = readMobileFile("src/components/AccountPageShell.tsx");

    // Full menu (no 9-item cap) + Profile accordion sub-nav + active-by-route helpers.
    // Rows flow through the shared GoGoPass rollout filter (default-on: it only
    // drops the /membership row when EXPO_PUBLIC_ENABLE_GOGOPASS="0" — see
    // gogopass-flag.test.ts), so the full-menu pin targets the filtered map.
    expect(shell).toContain("filterHiddenProfileMenuItems(profileHubMenuItems).map");
    expect(shell).not.toContain("profileHubMenuItems.slice(0, 9)");
    expect(shell).toContain("profileHubSubNavItems.map");
    expect(shell).not.toContain("profileHubGoGoTrackSubNavItems");
    expect(shell).toContain("shouldAutoExpandProfileSubNav");
    expect(shell).not.toContain("shouldAutoExpandGoGoTrackSubNav");
    expect(shell).toContain("isProfileSubNavItemActive");
    expect(shell).not.toContain("isGoGoTrackSubNavItemActive");
    expect(shell).toContain("isProfileMenuItemActive");
    // Log Out reuses the shared hook + confirm card.
    expect(shell).toContain("useMobileLogout");
    expect(shell).toContain("LogoutConfirmCard");
    // External rows open in a new tab.
    expect(shell).toContain('target="_blank"');
  });

  it("membership > given the GoGoPass page > then it renders inside AccountPageShell so it gets the rail", () => {
    const membership = readMobileFile("src/screens/CustomerMembershipScreen.tsx");

    expect(membership).toContain("AccountPageShell");
    expect(membership).not.toContain("styles.phoneFrame");
  });

  it("gototrack > given any GoGoTrack flow > then it renders inside AccountPageShell so it gets the rail", () => {
    const gototrack = readMobileFile("src/screens/CustomerGoGoTrackScreen.tsx");

    expect(gototrack).toContain("AccountPageShell");
    expect(gototrack).toContain("showProfileRail");
    expect(gototrack).not.toContain("styles.phoneFrame");
    expect(gototrack).not.toContain("CustomerDesktopFooterSlot");
  });
});
