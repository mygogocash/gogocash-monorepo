import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Pixel-parity guard for the signed-in header pill. The source of truth is the
// Next.js web ProfileBar (src/features/profile/component/ProfileBar.tsx), its
// PremiumMark (src/components/premium/PremiumMark.tsx), the premium tokens
// (src/components/premium/premiumTokens.ts) and the gc-soft-panel utility
// (src/app/globals.css). These assertions lock the Expo bar to those values so a
// future refactor can't silently drift the design.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Expo ProfileBar pixel parity", () => {
  const profileBar = readSource("src/components/CustomerProfileBar.tsx");
  const profileMark = readSource("src/components/GoGoPassMark.tsx");

  it("profile bar > given the gc-soft-panel pill > then matches the web panel geometry", () => {
    // .gc-soft-panel { border:1px solid rgba(195,209,196,.75); box-shadow: --gc-shadow-soft;
    //   background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(247,250,244,.92)) }
    // + flex h-12 (48px) items-center gap-2.5 (10px) rounded-full px-2 (8px)
    expect(profileBar).toContain("height: 48");
    expect(profileBar).toContain("borderRadius: 999");
    expect(profileBar).toContain("gap: 10");
    expect(profileBar).toContain("paddingHorizontal: 8");
    // Border keeps its light literal but adapts in dark via pickThemed.
    expect(profileBar).toContain('"rgba(195, 209, 196, 0.75)"');
    // --gc-shadow-soft: 0 4px 10px rgba(0, 0, 0, 0.1)
    expect(profileBar).toContain('boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)"');
    expect(profileBar).toContain(
      "linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 244, 0.92))"
    );
  });

  it("profile bar > given a member > then shows the compact gold mark, never the GOGOPASS pill", () => {
    // The web comment is explicit: the full label competes with the username at
    // this compact size, so it uses PremiumMark (size 13), not the badge pill.
    expect(profileBar).toContain("GoGoPassMark");
    expect(profileBar).toContain("size={13}");
    expect(profileBar).not.toContain("GoGoPassBadge");
  });

  it("profile bar > given name + balance > then matches the web typography", () => {
    // name: text-[13px], premium font-semibold text-[#3B3B3B] / free text-[#87948B]
    expect(profileBar).toContain("fontSize: 13");
    // Theme token (light value == the web #3B3B3B); free tier keeps the literal grey.
    expect(profileBar).toContain("color: colors.ink");
    expect(profileBar).toContain('color: "#87948B"');
    // balance: text-[14px] font-medium tabular-nums, color designSystemColor.mint (#00cc99 = colors.primary)
    expect(profileBar).toContain("fontSize: 14");
    expect(profileBar).toContain('fontVariant: ["tabular-nums"]');
    expect(profileBar).toContain("color: colors.primary");
  });

  it("profile bar > given the chevron > then matches the web ArrowIcon (16x9, mint, rotates when open)", () => {
    expect(profileBar).toContain('viewBox="0 0 16 9"');
    expect(profileBar).toContain("fill={colors.primary}");
    expect(profileBar).toContain('rotate: "180deg"');
  });

  it("profile bar > given the avatar ring > then uses the web PremiumAvatar 2px ring", () => {
    // Web PremiumAvatar default ringWidth = 2 → outer = size + 6 (40px for size 34).
    expect(profileBar).toContain("ringWidth={2}");
  });

  it("profile bar > given no session avatar > then shows ProfileAvatarImage, not a glyph", () => {
    // Web hardcodes <Image src="/profile.png" .../>; Expo mirrors with ProfileAvatarImage
    // (session avatar_url takes precedence; bundled asset is the fallback).
    expect(profileBar).toContain("ProfileAvatarImage");
    expect(profileBar).not.toContain("avatarFallback");
  });

  it("profile mark > given a free tier > then renders nothing (premium-only, like PremiumMark)", () => {
    expect(profileMark).toContain("return null;");
  });

  it("profile mark > given a member > then renders the gold verification burst", () => {
    // premiumTokens GOGOPASS: accent #D4AF37, accentSoft #F4E4A8; web mark deep stop #8B6914.
    expect(profileMark).toContain('viewBox="0 0 16 16"');
    expect(profileMark).toContain('accent: "#D4AF37"');
    expect(profileMark).toContain('accentSoft: "#F4E4A8"');
    expect(profileMark).toContain("#8B6914");
    expect(profileMark).toContain("M8 1l1.3 1.8"); // 12-point star path
  });
});

describe("Expo profile bar hover affordance", () => {
  const nav = readSource("src/components/CustomerProfileNav.tsx");

  it("account chip > given MotionPressable's hover-lift shadow > then the trigger is rounded so the shadow follows the pill, not a square box", () => {
    // MotionPressable applies its hover boxShadow to the OUTER trigger. The visible pill
    // (CustomerProfileBar) is an inner View with borderRadius 999, so without a matching
    // radius on the trigger the hover shadow renders as a square box around the chip.
    // Round the trigger to the pill radius (web parity with the sibling header chips,
    // which all carry their pill radius on the MotionPressable).
    expect(nav).toContain("borderRadius: radii.chip");
    expect(nav).toContain("styles.chip");
  });
});

describe("Expo profile dropdown menu navigation", () => {
  const menu = readSource("src/components/CustomerProfileMenu.tsx");

  it("menu rows > given a tap > then navigate via expo-router Link (not imperative router.push)", () => {
    // router.push() from inside the popover does NOT navigate on web; the app's
    // proven pattern is <Link asChild href> (see CustomerProfileScreen ProfileNavRow).
    // These guards lock the fix so the menu can't regress to a no-op.
    expect(menu).toContain('from "expo-router"');
    expect(menu).toContain("<Link");
    expect(menu).toContain("href={href as never}");
    expect(menu).not.toContain("router.push");
    expect(menu).not.toContain("useRouter");
  });

  it("menu rows > given each item > then expose an accessible name + close on press", () => {
    expect(menu).toContain("accessibilityLabel={tc(label)}");
    expect(menu).toContain("onPress={onClose}");
  });

  it("menu rows > given an external item > then open in a new tab (web parity: target=_blank)", () => {
    // The web renders external rows as <a target="_blank" rel="noopener noreferrer">.
    // expo-router <Link asChild> drops target/rel onto a custom child, so external rows
    // open out via window.open(_blank) / Linking instead.
    expect(menu).toContain("openExternalUrl");
    expect(menu).toContain('"_blank"');
    expect(menu).toContain('"noopener,noreferrer"');
  });

  it("menu > given the list + hero + logout > then reuses the shared web-parity sources", () => {
    expect(menu).toContain("profileHubMenuItems");
    expect(menu).toContain("AccountWalletHeroCard");
    expect(menu).toContain("clearMobileAppSession");
  });

  it("popover wallet hero glass > given dark theme > then keeps dark ink on the light frosted panel", () => {
    // The mint glass gradient is unchanged in dark mode; colors.ink flips to #E8ECEA
    // and disappears on the pale wash. Lock body copy to the web's #3B3B3B.
    expect(menu).toContain("const heroGlassInk = \"#3B3B3B\"");
    expect(menu).toContain("color: heroGlassInk");
    expect(menu).not.toMatch(/heroKicker:\s*\{[^}]*color:\s*colors\.ink/);
    expect(menu).not.toMatch(/heroAmount:\s*\{[^}]*color:\s*colors\.ink/);
  });

  it("menu > given external rows > then point at the web's external URLs", () => {
    // Match the web ProfileHeaderPopperContent external hrefs (GOGOCASH_MARKETING_ORIGIN
    // = gogocash.co; supportHref = lin.ee LINE; linktree). Locks them against drift.
    const design = readSource("src/design/webDesignParity.ts");
    expect(design).toContain('href: "https://gogocash.co/term-of-use"');
    expect(design).toContain('href: "https://gogocash.co/terms-of-service"');
    expect(design).toContain('href: "https://lin.ee/7om5sAr"');
    expect(design).toContain('href: "https://linktr.ee/gogocash"');
  });
});
