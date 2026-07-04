import { describe, expect, it } from "vitest";

import {
  isGoGoTrackSubNavItemActive,
  isProfileMenuItemActive,
  isProfileSectionHubActive,
  isProfileSectionPath,
  isProfileSubNavItemActive,
  shouldAutoExpandGoGoTrackSubNav,
  shouldAutoExpandProfileSubNav,
} from "@mobile/navigation/profileSectionNav";

describe("profile section nav", () => {
  describe("isProfileSectionPath > given a pathname > then it matches the web integrated-shell set", () => {
    it.each([
      "/profile",
      "/profile/info",
      "/profile/my-rating",
      "/profile/offer",
      "/profile/cf-phone",
      "/profile/verify-phone",
      "/referral",
      "/wallet",
      "/gototrack",
      "/gototrack/settings",
      "/withdraw",
      "/withdraw/my-cashback",
      "/method",
      "/method/create",
      "/membership",
      "/missing-orders",
      "/favorite",
      "/quest/history",
      "/age-verification",
      "/privacy-center",
      "/credit-score",
      "/language",
      "/subscription",
      "/pricing",
      "/billing",
    ])("includes %s", (pathname) => {
      expect(isProfileSectionPath(pathname)).toBe(true);
    });

    it.each([
      "/",
      "/discover",
      "/quest",
      "/golink",
      "/shops",
      "/shop/123",
      "/privacy-policy",
      "/login",
      "/register",
    ])("excludes %s", (pathname) => {
      expect(isProfileSectionPath(pathname)).toBe(false);
    });
  });

  describe("isProfileSectionHubActive > given a pathname > then the Profile parent is active only within the hub", () => {
    it.each(["/profile", "/profile/info", "/profile/my-rating", "/credit-score", "/method", "/method/create", "/language"])(
      "is active for %s",
      (pathname) => {
        expect(isProfileSectionHubActive(pathname)).toBe(true);
      }
    );

    it.each(["/wallet", "/referral", "/membership", "/favorite", "/missing-orders", "/privacy-center"])(
      "is inactive for %s",
      (pathname) => {
        expect(isProfileSectionHubActive(pathname)).toBe(false);
      }
    );
  });

  describe("isProfileSubNavItemActive > given a pathname and a sub-nav href > then only the matching item is active", () => {
    it("activates Personal Information on /profile and /profile/info", () => {
      expect(isProfileSubNavItemActive("/profile", "/profile/info")).toBe(true);
      expect(isProfileSubNavItemActive("/profile/info", "/profile/info")).toBe(true);
      expect(isProfileSubNavItemActive("/profile/my-rating", "/profile/info")).toBe(true);
    });

    it("does NOT activate Personal Information on /method, /language, or /credit-score", () => {
      expect(isProfileSubNavItemActive("/method", "/profile/info")).toBe(false);
      expect(isProfileSubNavItemActive("/language", "/profile/info")).toBe(false);
      expect(isProfileSubNavItemActive("/credit-score", "/profile/info")).toBe(false);
    });

    it("activates My Rating Score on /credit-score", () => {
      expect(isProfileSubNavItemActive("/credit-score", "/credit-score")).toBe(true);
      expect(isProfileSubNavItemActive("/profile", "/credit-score")).toBe(false);
    });

    it("activates Withdraw Methods on /method (+ sub-paths)", () => {
      expect(isProfileSubNavItemActive("/method", "/method")).toBe(true);
      expect(isProfileSubNavItemActive("/method/create", "/method")).toBe(true);
      expect(isProfileSubNavItemActive("/language", "/method")).toBe(false);
    });

    it("activates Account Setting on /language", () => {
      expect(isProfileSubNavItemActive("/language", "/language")).toBe(true);
      expect(isProfileSubNavItemActive("/method", "/language")).toBe(false);
    });
  });

  describe("shouldAutoExpandProfileSubNav > given a pathname > then the accordion opens only in the hub", () => {
    it("opens within the profile hub", () => {
      expect(shouldAutoExpandProfileSubNav("/profile/info")).toBe(true);
      expect(shouldAutoExpandProfileSubNav("/method")).toBe(true);
    });

    it("stays closed outside the hub", () => {
      expect(shouldAutoExpandProfileSubNav("/wallet")).toBe(false);
      expect(shouldAutoExpandProfileSubNav("/membership")).toBe(false);
    });
  });

  describe("shouldAutoExpandGoGoTrackSubNav > given a pathname > then the accordion opens only on GoGoTrack routes", () => {
    it("opens within GoGoTrack", () => {
      expect(shouldAutoExpandGoGoTrackSubNav("/gototrack/timeline")).toBe(true);
      expect(shouldAutoExpandGoGoTrackSubNav("/gototrack/settings")).toBe(true);
    });

    it("stays closed outside GoGoTrack", () => {
      expect(shouldAutoExpandGoGoTrackSubNav("/wallet")).toBe(false);
      expect(shouldAutoExpandGoGoTrackSubNav("/profile")).toBe(false);
    });
  });

  describe("isGoGoTrackSubNavItemActive > given a pathname and sub-nav href > then only the matching item is active", () => {
    it("activates Overview only on the hub route", () => {
      expect(isGoGoTrackSubNavItemActive("/gototrack", "/gototrack")).toBe(true);
      expect(isGoGoTrackSubNavItemActive("/gototrack/settings", "/gototrack")).toBe(false);
    });

    it("activates nested routes by prefix", () => {
      expect(isGoGoTrackSubNavItemActive("/gototrack/settings", "/gototrack/settings")).toBe(true);
      expect(isGoGoTrackSubNavItemActive("/gototrack/timeline", "/gototrack/timeline")).toBe(true);
    });
  });

  describe("isProfileMenuItemActive > given a menu item and pathname > then it highlights the right row", () => {
    it("matches an internal item by activePrefix (exact + sub-path)", () => {
      const wallet = { label: "My Wallet", href: "/wallet", activePrefix: "/wallet" };
      expect(isProfileMenuItemActive(wallet, "/wallet")).toBe(true);
      expect(isProfileMenuItemActive(wallet, "/wallet/x")).toBe(true);
      expect(isProfileMenuItemActive(wallet, "/membership")).toBe(false);
    });

    it("treats the Profile item as the hub (active across all hub sub-routes)", () => {
      const profile = { label: "Profile", href: "/profile", activePrefix: "/profile" };
      expect(isProfileMenuItemActive(profile, "/credit-score")).toBe(true);
      expect(isProfileMenuItemActive(profile, "/method")).toBe(true);
      expect(isProfileMenuItemActive(profile, "/wallet")).toBe(false);
    });

    it("never activates external items", () => {
      const ext = { label: "Help Center", href: "https://lin.ee/x", external: true } as const;
      expect(isProfileMenuItemActive(ext, "/profile")).toBe(false);
    });
  });
});
