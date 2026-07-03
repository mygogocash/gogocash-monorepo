import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { profileHubMenuItems } from "@mobile/design/webDesignParity";
import { isProfileMenuItemActive, isProfileSectionPath } from "@mobile/navigation/profileSectionNav";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("profile GoGoTrack menu entry", () => {
  it("profileHubMenuItems > given the profile hub > then includes GoGoTrack linking to the setup hub", () => {
    const item = profileHubMenuItems.find((entry) => entry.label === "GoGoTrack");

    expect(item).toEqual({
      label: "GoGoTrack",
      href: "/gototrack",
      activePrefix: "/gototrack",
    });
  });

  it("profile menu icon > given GoGoTrack row > then maps to the activity icon", () => {
    const iconsFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/profileMenuIcons.ts"),
      "utf8",
    );

    expect(iconsFile).toContain('GoGoTrack: GoGoTrackIcon');
    expect(iconsFile).toContain("Activity as GoGoTrackIcon");
  });

  it("profile section nav > given GoGoTrack routes > then highlights the menu item and keeps the profile shell", () => {
    const item = profileHubMenuItems.find((entry) => entry.label === "GoGoTrack");
    expect(item).toBeDefined();

    expect(isProfileSectionPath("/gototrack")).toBe(true);
    expect(isProfileSectionPath("/gototrack/settings")).toBe(true);
    expect(isProfileMenuItemActive(item!, "/gototrack/settings")).toBe(true);
    expect(isProfileMenuItemActive(item!, "/wallet")).toBe(false);
  });
});
