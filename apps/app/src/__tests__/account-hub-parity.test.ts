import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  getScaledCompactBrandCardMetrics,
  getShopDirectoryGridMetrics,
  mobileShellLayout,
} from "@mobile/design/webDesignParity";
import { chunkDirectoryGridRows } from "@mobile/screens/discovery/directoryVirtualizedGrid";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Account hub route parity", () => {
  it("mobile bottom nav > given account hub routes > then Wallet Quest and Profile share the staging nav", () => {
    const bottomNavFile = readMobileFile("src/components/CustomerMobileBottomNav.tsx");

    expect(bottomNavFile).toContain("webMobileBottomNavItems");
    expect(bottomNavFile).toContain('from "@mobile/theme/icons"');
    expect(bottomNavFile).not.toContain("lucide-react-native");
    expect(bottomNavFile).toContain("activeRouteId");
    expect(bottomNavFile).toContain("mobileShellLayout.bottomNavMaxWidth");
    expect(bottomNavFile).toContain("shadows.bottomNavCss");

    // GoGoLink from mobile bottom nav opens the sheet overlay — never `/golink` route navigation.
    expect(bottomNavFile).toContain('href === "/golink"');
    expect(bottomNavFile).toContain("onGoLinkPress");
    expect(bottomNavFile).toContain('presentation="homeSheet"');

    // Emphasized (Wallet) center button mirrors web FooterMobile: 64x64 (h-[64px] w-[64px])
    // lifted -32px (-mt-8), and the active profile avatar is h-7 w-7 (28px) — not 72/-22/34.
    expect(bottomNavFile).toContain("marginTop: -32,");
    expect(bottomNavFile).not.toContain("marginTop: -22,");
    expect(bottomNavFile).not.toContain("height: 72,");
    expect(bottomNavFile).not.toContain("width: 72,");
    expect(bottomNavFile).not.toContain("height: 34,");
    expect(bottomNavFile).not.toContain("width: 34,");
  });

  it("wallet page > given migrated account screen > then it renders support banner, cashback summary, transactions, and bottom nav", () => {
    const walletFile = readMobileFile("src/screens/CustomerWalletScreen.tsx");
    const shellFile = readMobileFile("src/components/AccountPageShell.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webAccountPageSurface");
    expect(designFile).toContain("webWalletSupportBanner");
    expect(designFile).toContain(
      "Report if your cashback wasn't tracked or added after a purchase."
    );
    expect(designFile).toContain("Our team will review it for you.");
    expect(designFile).toContain("Contact Support");
    expect(designFile).toContain("LINE Official Account");
    expect(designFile).toContain("webWalletAccessibleSummary");
    expect(designFile).toContain("Total Cashback Available: 3,180.24");
    expect(designFile).toContain("Last Updated: 28 Mar 2026 07:00");
    expect(designFile).toContain("webWalletCashbackSummary");
    expect(designFile).toContain("A simple snapshot of your rewards");
    expect(designFile).toContain("Every purchase we’re tracking for cashback");
    expect(designFile).toContain("3,504.60");
    expect(designFile).toContain("633.60");
    expect(designFile).toContain("THB");
    expect(designFile).toContain("webWalletTransactionTabs");
    expect(designFile).toContain("All Transactions");
    expect(designFile).toContain("Earning Transactions");
    expect(designFile).toContain("Withdraw Transactions");
    expect(designFile).toContain("Total Cashback");
    expect(designFile).toContain("Pending Cashback");
    expect(designFile).toContain("Withdrawn");
    expect(shellFile).toContain("CustomerMobileBottomNav");
    expect(shellFile).toContain("bottomInset={insets.bottom}");
    expect(walletFile).toContain('activeRouteId="wallet"');
    expect(walletFile).toContain("showTitle={false}");
    expect(walletFile).toContain("AccountPageShell");
    expect(walletFile).toContain("WalletHeader");
    expect(walletFile).toContain("WalletSupportBanner");
    expect(walletFile).toContain("WalletCashbackSummary");
    expect(walletFile).toContain("WalletMetricCard");
    expect(walletFile).toContain("webWalletAccessibleSummary");
    expect(walletFile).toContain("webWalletSupportBanner");
    expect(walletFile).toContain("webWalletCashbackSummary");
    expect(walletFile).toContain("Search");
    expect(walletFile).toContain("Date Range");
    expect(walletFile).toContain("Status");
    expect(designFile).toContain("It's been a while since your last wallet visit.");
    expect(walletFile).not.toContain("AccountWalletHeroCard");
    expect(walletFile).not.toContain("CashbackSummaryBreakdown");
    expect(walletFile).not.toContain('["All", "Earning", "Withdraw"]');
    expect(walletFile).not.toContain("Available cashback appears here after partner validation.");
  });

  it("wallet hero compact overrides actually collapse the desktop min-heights", () => {
    // User report 2026-07-10: the profile wallet hero showed a 72px dead gap
    // under the name and 71px of empty gradient below the Withdraw button on
    // mobile. Root cause: the compact overrides used `minHeight: undefined`,
    // which RN style merging SKIPS — the desktop minHeight (86 header /
    // 260 glass) silently survived. Overrides must use 0, not undefined.
    const shellFile = readMobileFile("src/components/AccountPageShell.tsx");
    expect(shellFile).not.toContain("minHeight: undefined");
    expect(shellFile).toMatch(/walletHeroHeaderCompact:[\s\S]*?minHeight: 0/);
    expect(shellFile).toMatch(/walletHeroGlassPanelCompact:[\s\S]*?minHeight: 0/);
  });

  it("quest page > given migrated account screen > then it renders quest tabs, task detail, and bottom nav", () => {
    const questFile = readMobileFile("src/screens/CustomerQuestScreen.tsx");
    const shellFile = readMobileFile("src/components/AccountPageShell.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webQuestTabs");
    expect(designFile).toContain("How to win!");
    expect(designFile).toContain("Leaderboard");
    expect(designFile).toContain("webQuestAssets");
    expect(designFile).toContain("quest/banner_en.png");
    expect(designFile).toContain("quest/how_to_earn_en.png");
    expect(shellFile).toContain("CustomerMobileBottomNav");
    expect(shellFile).toContain("bottomInset={insets.bottom}");
    expect(questFile).toContain('activeRouteId="quest"');
    expect(questFile).toContain("questBannerImage");
    expect(questFile).toContain("questHowToEarnImage");
    expect(questFile).toContain("questPromoImage");
    expect(questFile).toContain("webQuestTabs");
    expect(questFile).toContain("Explore other Shops");
    expect(questFile).toContain("getResponsiveHomeLayoutMetrics");
    expect(questFile).toContain("compactBrandCardsPerPage");
    expect(questFile).toContain("getShopDirectoryGridMetrics");
    expect(questFile).toContain("getScaledCompactBrandCardMetrics");
    expect(questFile).toContain("chunkDirectoryGridRows");
    // Explore-other-Shops renders the SHARED BrandCard (2026-07-11 tile
    // convergence) — the local clone card is gone for good.
    expect(questFile).toContain("<BrandCard");
    expect(questFile).not.toContain("CompactExploreShopCard");
    expect(questFile).toContain('resourceId: "brandCatalog"');
    expect(questFile).toContain("resolveLiveBrandCards");
    expect(questFile).not.toContain("exploreOtherShops.cards.slice(0, 4)");
    expect(questFile).toContain("Let’s Got the Tasks Done!");
    expect(questFile).not.toContain("Earn extra rewards.");
  });

  it("quest explore shops > given 414px viewport > then grid uses 2 directory columns like Categories", () => {
    const questContentWidth = 414 - mobileShellLayout.contentHorizontalPadding * 2;
    const gridMetrics = getShopDirectoryGridMetrics({
      contentWidth: questContentWidth,
      viewportWidth: 414,
    });
    const scaledCard = getScaledCompactBrandCardMetrics(gridMetrics.cardWidth);
    const sampleCards = ["A", "B", "C", "D", "E", "F"];
    const rows = chunkDirectoryGridRows(sampleCards, gridMetrics.columns);

    expect(gridMetrics).toEqual({
      cardWidth: 185,
      columns: 2,
      gap: 12,
    });
    expect(scaledCard.logoVisualHeight).toBeGreaterThan(100);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveLength(2);
  });

  it("quest leaderboard > given the Leaderboard tab is selected > then it matches the staging rank panel", () => {
    const questFile = readMobileFile("src/screens/CustomerQuestScreen.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webQuestLeaderboardRows");
    expect(designFile).toContain("Sta...ter");
    expect(designFile).toContain("2,100");
    expect(designFile).toContain("Lun...int");
    expect(designFile).toContain("1,840");
    expect(designFile).toContain("Que...Kid");
    expect(designFile).toContain("1,590");
    expect(questFile).toContain("QuestLeaderboardPanel");

    // Web Quest ListRank renders a MyRank summary card above the rank list (MyRank.tsx):
    // #F1FFFC card, #00CC99 border, two columns My Rank / My Total Points, plus a View Points
    // expander revealing Your Spending + Your Special Tasks. Expo had none.
    expect(questFile).toContain("QuestMyRankCard");
    expect(questFile).toContain("webQuestMyRank");
    expect(questFile).toContain("#F1FFFC");
    expect(designFile).toContain("webQuestMyRank");
    expect(designFile).toContain("My Rank");
    expect(designFile).toContain("My Total Points");
    expect(designFile).toContain("View Points");
    expect(designFile).toContain("Your Spending");
    expect(questFile).toContain('activeTab === "leaderboard"');
    expect(questFile).toContain("questPromoImage");
    expect(questFile).toContain('GoGoQuest ${tc("History")}');
    expect(questFile).not.toContain("USER 1");
    expect(questFile).not.toContain("1500 - index * 120");
  });

  it("quest tasks > given the Tasks tab is selected > then it matches the staging task rows", () => {
    const questFile = readMobileFile("src/screens/CustomerQuestScreen.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webQuestTaskRows");
    expect(designFile).toContain("Watch Ads");
    expect(designFile).toContain("+10 Points");
    expect(designFile).toContain("Grocery Galaxy");
    expect(designFile).toContain("Pocket Pantry");
    expect(designFile).toContain("Orbit Airways");
    expect(designFile).toContain("PixelPort");
    expect(designFile).toContain("Glow Theory");
    expect(designFile).toContain("+0 Points");
    expect(questFile).toContain("QuestTaskPanel");
    expect(questFile).toContain("useQuestTaskRows");
    expect(questFile).toContain("questTasks.rows.map");
    expect(questFile).toContain("TaskPointsPill");
    expect(questFile).not.toContain("Daily check-in");
    expect(questFile).not.toContain("Shop 300 Baht+ on any shops");
    expect(questFile).not.toContain("Invite your Friends");
  });

  it("profile page > given migrated account screen > then it renders full profile nav and bottom nav", () => {
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");
    const shellFile = readMobileFile("src/components/AccountPageShell.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webProfileSectionOrder");
    expect(designFile).toContain("webProfileWalletSummary");
    expect(designFile).toContain("Mock User");
    expect(designFile).toContain("***0001");
    expect(designFile).toContain("3,180.24");
    expect(designFile).toContain("THB");
    expect(designFile).toContain("Last Updated: 28 Mar 2026 07:00");
    expect(designFile).toContain("profileInviteUrl");
    expect(designFile).toContain("My Rating Score");
    expect(designFile).toContain("GoGoPass");
    expect(designFile).toContain("Invite your Friends");
    expect(designFile).not.toContain("Credit Score");
    expect(designFile).not.toContain("Refer Your Friends");
    // Profile hub menu labels the /membership row "GoGoPass", never "Membership".
    // (Scoped to the menu-item label so it doesn't trip on the unrelated
    // webMembershipLanding landing-page fixture, which is correct to exist.)
    expect(designFile).not.toContain('label: "Membership"');
    expect(designFile).toContain("walletSummaryHeroCard");
    expect(designFile).toContain("profileNavigationPanel");
    expect(shellFile).toContain("CustomerMobileBottomNav");
    expect(shellFile).toContain("bottomInset={insets.bottom}");
    expect(shellFile).toContain("showTitle = true");
    expect(shellFile).toContain('lastUpdated = null');
    expect(profileFile).toContain('activeRouteId="profile"');
    expect(profileFile).toContain("showTitle={false}");
    expect(profileFile).toContain("AccountPageShell");
    expect(profileFile).toContain("AccountWalletHeroCard");
    expect(profileFile).toContain("webProfileWalletSummary");
    expect(profileFile).toContain("useMobileSessionSnapshot");
    expect(profileFile).toContain("getSessionWalletSummary");
    expect(profileFile).toContain("useProfileWalletAmount");
    expect(profileFile).toContain("ProfilePanelHeader");
    expect(profileFile).toContain("InviteFriendsRow");
    expect(profileFile).toContain("copyInviteLink");
    expect(profileFile).toContain("copyToClipboard");
    expect(profileFile).toContain("Invited : 2");
    expect(profileFile).toContain("Copy Link");
    expect(profileFile).toContain("profileMenuIcons");
    expect(profileFile).toContain("ChevronUpIcon");
    expect(profileFile).toContain("profileHubSubNavItems");
    expect(profileFile).toContain("profileHubMenuItems");
    expect(profileFile).toContain('.filter((item) => item.label !== "Profile")');
    expect(profileFile).toContain(".map((item) =>");
    expect(profileFile).toContain("Log Out");
    expect(profileFile).not.toContain("icon: string");
    expect(profileFile).not.toContain('return "G"');
    expect(profileFile).not.toContain("profileHubMenuItems.slice(0, 10)");
  });

  it("profile invite row > given web hover > then row hover is container-level without nested hoverLift", () => {
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");
    const inviteFriendsRow =
      profileFile.match(/function InviteFriendsRow[\s\S]*?\n\}\n\nfunction copyInviteLink/)?.[0] ??
      "";

    expect(inviteFriendsRow.match(/hoverLift=\{false\}/g)?.length).toBe(2);
    expect(inviteFriendsRow).toContain("onHoverIn");
    expect(inviteFriendsRow).toContain("onHoverOut");
    expect(inviteFriendsRow).toContain("inviteRowHovered");
    expect(profileFile).toMatch(
      /inviteCardLinkArea:[\s\S]*backgroundColor: "transparent"/,
    );
    expect(profileFile).toMatch(
      /inviteRowHovered:[\s\S]*backgroundColor: pickThemed\(colors, "#C8DFFB"/,
    );
  });

  it("profile referral nav > given selected Next referral row > then Expo renders the same highlighted card and copy affordance", () => {
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");

    expect(profileFile).toContain("inviteCardLinkArea");
    expect(profileFile).toContain("inviteTitle");
    expect(profileFile).toContain("Invite your Friends");
    expect(profileFile).toContain("Invited : 2");
    expect(profileFile).toContain("Copy Link");
    expect(profileFile).toContain("useRouter");
    expect(profileFile).toContain("router.push(href as never)");
    expect(profileFile).toContain("pickThemed(colors, \"#DCEBFF\", colors.primarySoft)");
    expect(profileFile).toContain("minHeight: 52");
    expect(profileFile).toContain("borderRadius: 18");
    expect(profileFile).toContain("minWidth: 102");
    expect(profileFile).toContain("height: 24");
    expect(profileFile).toContain("copyButtonIcon");
    expect(profileFile).toContain("fontWeight: typography.labelWeight");
  });

  it("profile accordion > given web SubProfile trigger > then Profile header toggles only profile sub menu", () => {
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");

    expect(profileFile).toContain("useState");
    expect(profileFile).toContain("profileSubNavOpen");
    expect(profileFile).toContain("setProfileSubNavOpen((open) => !open)");
    expect(profileFile).toContain('accessibilityRole="button"');
    expect(profileFile).toContain("accessibilityState={{ expanded: profileSubNavOpen }}");
    expect(profileFile).toContain("profileSubNavOpen ? (");
    expect(profileFile).toContain("<ChevronUpIcon");
    expect(profileFile).toContain("<ChevronDownIcon");
    expect(profileFile).toContain("{profileSubNavOpen ? (");
    expect(profileFile).toContain("<View style={styles.profileSubNavGroup}>");
    expect(profileFile).toContain('.filter((item) => item.label !== "Profile")');
  });

  it("profile page > given staging mobile profile card > then wallet hero profile panel and nav avatar match the reference", () => {
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");
    const shellFile = readMobileFile("src/components/AccountPageShell.tsx");
    const bottomNavFile = readMobileFile("src/components/CustomerMobileBottomNav.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webProfileWalletHeroSurface");
    expect(designFile).toContain('sourceAsset: "profile/back_wallet.svg"');
    expect(designFile).toContain('headerColor: "#00AA80"');
    expect(designFile).toContain('assetBaseColor: "#5D87FF"');
    expect(designFile).toContain('outerColor: "#8ADBAE"');
    expect(designFile).toContain('glassBorderColor: "rgba(255, 255, 255, 0.4)"');
    expect(designFile).toContain("glassBackgroundImage");
    expect(shellFile).toContain("profileSurfaceMobile");
    expect(shellFile).toContain("backgroundColor: surfaces.profileSurfaceMobile");
    expect(shellFile).toContain('boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)"');
    expect(shellFile).toContain("profileContentMobileInner");
    expect(shellFile).toContain("backgroundColor: surfaces.profileContentInner");
    const surfacesFile = readMobileFile("src/theme/themeSurfaces.ts");
    expect(surfacesFile).toContain('profileSurfaceMobile: isDark ? "rgba(26,31,29,0.9)" : "rgba(255,255,255,0.9)"');
    expect(surfacesFile).toContain('profileContentInner: isDark ? "rgba(26,31,29,0.8)" : "rgba(255,255,255,0.8)"');
    expect(shellFile).toContain("padding: 16");
    expect(shellFile).toContain("walletHeroTopBand");
    expect(shellFile).toContain("walletHeroGlassPanel");
    expect(shellFile).toContain("walletHeroGlassGradientStyle");
    expect(shellFile).toContain("webProfileWalletHeroSurface.glassBackgroundImage");
    expect(shellFile).toContain("COMPACT_WALLET_HERO_MAX_WIDTH");
    expect(shellFile).toContain("DESKTOP_WALLET_AVATAR_SIZE");
    expect(shellFile).toContain("walletHeroGlassPanelCompact");
    expect(shellFile).toContain("walletHeroIdRowCompact");
    expect(shellFile).toContain("profileContentMobile");
    expect(shellFile).toContain("profileContentDesktop");
    expect(shellFile).toContain("webProfileWalletHeroSurface.headerColor");
    expect(shellFile).toContain("webProfileWalletHeroSurface.outerColor");
    expect(shellFile).toContain("webProfileWalletHeroSurface.glassFallbackColor");
    expect(shellFile).toContain("webProfileWalletHeroSurface.glassBorderColor");
    expect(shellFile).toContain('const walletGlassInk = "#3B3B3B"');
    expect(shellFile).toContain("color: walletGlassInk");
    expect(shellFile).not.toMatch(/walletKicker:\s*\{[^}]*color:\s*colors\.ink/);
    expect(shellFile).not.toContain('backgroundColor: "rgba(194, 232, 246, 0.88)"');
    expect(shellFile).not.toContain('backgroundColor: "rgba(112, 157, 255, 0.28)"');
    expect(shellFile).toContain("marginTop: -10");
    expect(shellFile).toContain("minHeight: 260");
    expect(shellFile).toContain("DESKTOP_WALLET_AVATAR_SIZE = 72");
    expect(shellFile).toContain("fontSize: 48");
    expect(shellFile).toContain("lineHeight: 56");
    expect(shellFile).toContain("minHeight: 60");
    expect(shellFile).toContain("fontSize: 20");
    expect(shellFile).toContain("borderTopLeftRadius: 18");
    expect(shellFile).toContain("paddingHorizontal: 28");
    expect(profileFile).toContain("profileHubStack");
    expect(profileFile).toContain("profilePanelShell");
    expect(profileFile).toContain('backgroundColor: "transparent"');
    expect(profileFile).toContain("borderWidth: 0");
    expect(profileFile).toContain("profilePanelHeaderIconRing");
    expect(profileFile).toContain("profileSubNavGroup");
    expect(profileFile).toContain("profileNavGroup");
    expect(profileFile).toContain("minHeight: 52");
    expect(profileFile).toContain("minHeight: 44");
    expect(profileFile).toContain("fontSize: 16");
    expect(profileFile).toContain("fontSize: 14");
    expect(profileFile).toContain("paddingHorizontal: 16");
    expect(profileFile).toMatch(/<InviteIcon[\s\S]{0,120}size=\{24\}/);
    expect(profileFile).toMatch(
      /inviteRow:[\s\S]*backgroundColor: pickThemed\(colors, "#DCEBFF", colors\.primarySoft\)[\s\S]*maxHeight: 52,[\s\S]*minHeight: 52/
    );
    expect(profileFile).toMatch(/copyButton:[\s\S]*height: 24,[\s\S]*minWidth: 102/);
    expect(profileFile).toContain("height: 14");
    expect(bottomNavFile).toContain("ProfileAvatarImage");
    expect(bottomNavFile).toContain("bottomNavProfileAvatar");
    expect(bottomNavFile).toContain('name === "profile" && active');
  });

  it("profile info page > given staging mobile subpage > then Expo renders the shared rich panel (cashback summary + personal information)", () => {
    // Wave 3 (panel extraction): the cashback-summary + personal-info sections — and
    // their strings — moved OUT of CustomerProfileDetailScreen into the shared
    // src/components/ProfileInfoPanel.tsx so /profile (desktop) and /profile/info can't
    // drift. The detail screen now just mounts <ProfileInfoPanel> inside its shell +
    // top bar, so the moved-string assertions read the panel module, not the screen.
    const detailFile = readMobileFile("src/screens/CustomerProfileDetailScreen.tsx");
    const panelFile = readMobileFile("src/components/ProfileInfoPanel.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webProfileInfoCashbackCard");
    expect(designFile).toContain("See your withdrawable total and how it splits by source.");
    expect(designFile).toContain("AVAILABLE TO WITHDRAW");
    expect(designFile).toContain("Linked My Cashback");
    expect(designFile).toContain("675.00");
    expect(designFile).toContain("GoGoCash balance");
    expect(designFile).toContain("2,505.24");

    // Detail screen: keeps the sub-page shell + back top bar and now delegates the
    // rich body to the shared panel.
    expect(detailFile).toContain("ProfileInfoSubPage");
    expect(detailFile).toContain("ProfileInfoTopBar");
    expect(detailFile).toContain("ProfileInfoPanel");
    expect(detailFile).toContain("AccountPageShell");
    expect(detailFile).toContain('activeRouteId="profile"');
    expect(detailFile).toContain('href="/profile"');
    expect(detailFile).not.toContain("<Text style={styles.infoTitle}>Personal Info</Text>");
    expect(detailFile).not.toContain("Back to profile");

    // Shared panel: now owns the cashback-summary + personal-information sections and
    // their parity strings (moved here from the detail screen).
    expect(panelFile).toContain("ProfileCashbackSummaryCard");
    expect(panelFile).toContain("profileCashbackHeaderCompact");
    expect(panelFile).toContain("profileCashbackWithdrawButtonCompact");
    expect(panelFile).toContain("ProfilePersonalInformationPanel");
    expect(panelFile).toContain("webProfileInfoCashbackCard");
    expect(panelFile).toContain("Personal Information");
    expect(panelFile).toContain("AVAILABLE TO WITHDRAW");
    // The new hero replaces the generic AccountWalletHeroCard on this surface; the
    // panel composes ProfileHeroCard. Its display name comes from the shared
    // identity resolver (fixture fallback lives inside it, fixtures-mode only —
    // live sessions must never render "Mock User"; field bug 2026-07-10).
    expect(panelFile).toContain("ProfileHeroCard");
    const heroFile = readMobileFile("src/components/ProfileHeroCard.tsx");
    expect(heroFile).toContain("resolveProfileDisplayName");
  });

  it("profile desktop panel > given web responsive /profile > then CustomerProfileScreen renders ProfileInfoPanel on desktop and the hub otherwise", () => {
    // Wave 3 wiring: /profile is now responsive like the web — the rich ProfileInfoPanel
    // on desktop (width >= mobileShellLayout.desktopBreakpoint), the existing account hub
    // on mobile.
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");

    expect(profileFile).toContain("useWindowDimensions");
    expect(profileFile).toContain("mobileShellLayout.desktopBreakpoint");
    expect(profileFile).toContain("const isDesktop = width >= mobileShellLayout.desktopBreakpoint");
    expect(profileFile).toContain("ProfileInfoPanel");
    expect(profileFile).toContain('from "@mobile/components/ProfileInfoPanel"');
    // Desktop branch renders the shared panel; the falsy branch keeps the hub stack.
    expect(profileFile).toContain("isDesktop ? (");
    expect(profileFile).toContain("<ProfileInfoPanel");
    expect(profileFile).toContain("profileHubStack");
    expect(profileFile).toContain("AccountWalletHeroCard");
  });

  it("credit score page > given staging GoGoPass score screen > then Expo renders the real rating score flow", () => {
    const routeFile = readMobileFile("app/credit-score.tsx");
    const scoreFile = readMobileFile("src/screens/CustomerCreditScoreScreen.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webCreditScorePage");
    expect(designFile).toContain("Your GoGoPass Score");
    expect(designFile).toContain("40 more points to Trusted");
    expect(designFile).toContain("⭐ Starter — 💜 Trusted");
    expect(designFile).toContain("40 / 80 pts");
    expect(designFile).toContain("Earn more points");
    expect(designFile).toContain("Email verified");
    expect(designFile).toContain("Phone verified");
    expect(designFile).toContain("Monthly spend ≥ ฿3,000");
    expect(designFile).toContain("What you get");
    expect(designFile).toContain("Free GoGoPass — 12 Months");
    expect(routeFile).toContain("CustomerCreditScoreScreen");
    expect(scoreFile).toContain("CreditScoreSubPage");
    expect(scoreFile).toContain("CreditScoreTopBar");
    expect(scoreFile).toContain("CreditScoreHero");
    expect(scoreFile).toContain("CreditScoreProgressCard");
    expect(scoreFile).toContain("CreditScoreBreakdown");
    expect(scoreFile).toContain("CreditScoreBenefits");
    expect(scoreFile).toContain("CreditScoreStreakCard");
    expect(scoreFile).toContain('activeRouteId="profile"');
    expect(scoreFile).toContain('href="/profile"');
    expect(scoreFile).toContain("creditScoreSurfaceBleed");
    expect(scoreFile).toContain("marginHorizontal: -8");
    expect(scoreFile).toContain("marginTop: 18");
    expect(scoreFile).not.toContain("CustomerUtilityScreen");
    expect(scoreFile).not.toContain("Credit Score");
  });

  it("withdraw method page > given staging payout-method screen > then Expo renders the real withdraw method list", () => {
    const routeFile = readMobileFile("app/method/index.tsx");
    const methodFile = readMobileFile("src/screens/CustomerWithdrawMethodScreen.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webWithdrawMethodPage");
    expect(designFile).toContain("Withdraw Method");
    expect(designFile).toContain("My withdrawal methods");
    expect(designFile).toContain("Add Methods");
    expect(designFile).toContain("[Default]");
    expect(designFile).toContain("Demo Shopper");
    expect(designFile).toContain("Kasikorn Bank");
    expect(designFile).toContain("****7890");
    expect(designFile).toContain("Bangkok Bank");
    expect(designFile).toContain("****3210");
    expect(routeFile).toContain("CustomerWithdrawMethodScreen");
    expect(methodFile).toContain("WithdrawMethodSubPage");
    expect(methodFile).toContain("WithdrawMethodTopBar");
    expect(methodFile).toContain("WithdrawMethodHeader");
    expect(methodFile).toContain("WithdrawMethodBankCard");
    expect(methodFile).toContain("DefaultBadge");
    expect(methodFile).toContain('activeRouteId="profile"');
    expect(methodFile).toContain('href="/profile"');
    expect(methodFile).toContain('href="/method/create"');
    expect(methodFile).toContain("withdrawMethodSurfaceBleed");
    expect(methodFile).toContain("methodGrid");
    expect(methodFile).toContain("minHeight: 183");
    expect(methodFile).toContain('pickThemed(colors, "#D8EDE4", colors.border)');
    expect(methodFile).toContain("boxShadow: shadows.cardCss");
    expect(methodFile).not.toContain("Payout Methods");
    expect(methodFile).not.toContain("Add Payout Method");
    expect(methodFile).not.toContain("0891234567");
  });

  it("account settings page > given staging language route > then Expo renders subscription notifications and community cards", () => {
    const routeFile = readMobileFile("app/language.tsx");
    const settingsFile = readMobileFile("src/screens/CustomerAccountSettingsScreen.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webAccountSettingsPage");
    expect(designFile).toContain("Account Settings");
    expect(designFile).toContain("Your Subscription");
    expect(designFile).toContain("View and manage your GoGoCash subscription billing on Stripe.");
    expect(designFile).toContain("Open Stripe Subscription");
    expect(designFile).toContain("Subscription billing is not enabled yet.");
    expect(designFile).toContain("Receive Notifications about Updates");
    expect(designFile).toContain("Notifications via Line");
    expect(designFile).toContain("Notifications via Email");
    expect(designFile).toContain("Coming soon");
    expect(designFile).toContain("Join our Community");
    expect(designFile).toContain("Facebook");
    expect(designFile).toContain("Instagram");
    expect(designFile).toContain("Line");
    expect(designFile).toContain("YouTube");
    expect(routeFile).toContain("CustomerAccountSettingsScreen");
    expect(settingsFile).toContain("AccountSettingsSubPage");
    expect(settingsFile).toContain("AccountSettingsTopBar");
    expect(settingsFile).toContain("SubscriptionSection");
    expect(settingsFile).toContain("NotificationSection");
    expect(settingsFile).toContain("CommunitySection");
    expect(settingsFile).toContain("CommunityCard");
    expect(settingsFile).toContain("accountSettingsSurfaceBleed");
    expect(settingsFile).toContain('activeRouteId="profile"');
    expect(settingsFile).toContain('href="/profile"');
    // Community cards render the web-parity banner PNGs (text + brand logo baked in) from the
    // Metro-bundled assets dir assets/account-settings-community/<id>.png — matching the web SubPage.
    expect(settingsFile).toContain("communityBanners");
    expect(settingsFile).toContain("account-settings-community/facebook.png");
    expect(settingsFile).toContain("<Image");
    expect(settingsFile).not.toContain("communityBrandStyles");
    expect(settingsFile).not.toContain("communityGlyph");
    expect(settingsFile).toContain("isEmailEnabled");
    expect(settingsFile).toContain("isLineEnabled");
    expect(settingsFile).toMatch(/accountSettingsSurfaceBleed:[\s\S]*marginTop: 8/);
    expect(settingsFile).toMatch(/content:[\s\S]*paddingHorizontal: 12,[\s\S]*paddingTop: 16/);
    expect(settingsFile).toMatch(/notificationStack:[\s\S]*gap: 8/);
    expect(settingsFile).not.toContain("Choose the app language");
    expect(settingsFile).not.toContain("Save language");
  });

  it("referral page > given staging referral screen > then Expo renders the banner earn card invitation tabs and table", () => {
    const routeFile = readMobileFile("app/referral.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webReferralPage");
    expect(designFile).toContain("Invite friends to GOGOCASH & get a 20 THB bonus!");
    expect(designFile).toContain(
      "Share your link or referral code below and enjoy your bonus instantly"
    );
    expect(designFile).toContain("Refer & Earn");
    expect(designFile).toContain("For each friend that you invite");
    expect(designFile).toContain("Share your referral link");
    expect(designFile).toContain("invite link");
    expect(designFile).toContain("Share referral link on social media");
    expect(designFile).toContain("All Invitations");
    expect(designFile).toContain("Created Account");
    expect(designFile).toContain("Shopped with Us");
    expect(designFile).toContain("FriendInvite");
    expect(designFile).toContain("120 pts");
    expect(designFile).toContain("Share with Friends and Get Rewards");
    expect(designFile).toContain("Copy your unique referral link.");
    expect(designFile).toContain("Refer Friends FAQs");
    expect(designFile).toContain("Exclusions");
    expect(designFile).toContain("Refunds, Cancellations, & no-shows");
    expect(designFile).toContain("Tracking Disclaimers");
    expect(routeFile).toContain("CustomerReferralScreen");
    expect(routeFile).not.toContain("CustomerProfileDetailScreen");

    const referralFile = readMobileFile("src/screens/CustomerReferralScreen.tsx");

    expect(referralFile).toContain("ReferralSubPage");
    expect(referralFile).toContain("ReferralTopBar");
    expect(referralFile).toContain("ReferralEarnCard");
    expect(referralFile).toContain("ReferralInvitationPanel");
    expect(referralFile).toContain("ReferralInvitationTabs");
    expect(referralFile).toContain("ReferralInvitationTable");

    // Web ReferralInvitationPanel renders a 4th Status column with a green Success pill.
    expect(designFile).toContain('"Point", "Status"');
    expect(designFile).toContain('status: "Success"');
    expect(referralFile).toContain("{tc(row.status)}");
    expect(referralFile).toContain("invitationStatusPill");
    expect(referralFile).toContain("#E6F7ED");
    expect(referralFile).toContain("#00B14F");
    expect(referralFile).toContain("ReferralStepsSection");
    expect(referralFile).toContain("ReferralFaqsSection");
    expect(referralFile).toContain("referralGiftImage");
    // Hero marketing banner removed — earn card leads the page.
    expect(referralFile).not.toContain("referralHeroBannerImage");
    expect(referralFile).toContain("helpBubbleIconImage");
    expect(referralFile).toContain("ContentCopyIcon");
    // Premium pass: how-it-works renders as numbered step cards, not the flat banner image.
    expect(referralFile).toContain("stepCard");
    expect(referralFile).not.toContain("referralStepBannerImage");
    // Premium pass: real brand SVG marks replace the text-glyph icons.
    expect(referralFile).toContain("FacebookBrandIcon");
    expect(referralFile).toContain("LinkedInBrandIcon");
    expect(referralFile).toContain("InstagramBrandIcon");
    expect(referralFile).toContain("XBrandIcon");
    expect(referralFile).toContain("shareUrlEncoded");
    expect(referralFile).toContain("openReferralShare");
    expect(referralFile).toContain("handleSocialPress");
    expect(referralFile).toContain("window.open");
    // Web parity: white surface (the old blue shell #DCEEFF was recolored to white).
    expect(referralFile).toContain("referralShell");
    expect(referralFile).not.toContain("referralBlueShell");
    expect(referralFile).not.toContain('"#DCEEFF"');
    expect(referralFile).toContain("referralSurfaceBleed");
    expect(referralFile).toContain("referralContentDesktop");
    expect(referralFile).toContain("earnCardDesktop");
    expect(referralFile).toContain('activeRouteId="profile"');
    expect(referralFile).toContain('href="/profile"');
    expect(referralFile).toMatch(/earnTitle:[\s\S]*fontSize: 32,[\s\S]*lineHeight: 40/);
    expect(referralFile).toMatch(/copyButton:[\s\S]*borderRadius: 16,[\s\S]*minHeight: 56/);
    expect(referralFile).toMatch(/stepCard:[\s\S]*borderRadius: 16/);
    expect(referralFile).toMatch(/faqTitle:[\s\S]*fontSize: 24,[\s\S]*lineHeight: 31/);
    expect(referralFile).not.toContain("Share GoGoCash and track referral rewards from one place.");
    expect(referralFile).not.toContain("Pending rewards");
    expect(referralFile).not.toContain("Completed referrals");
  });

  it("privacy policy page > given staging legal document > then Expo carries the dated legal contract and renderer pieces", () => {
    const routeFile = readMobileFile("app/privacy-policy.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");
    const privacyFile = readMobileFile("src/screens/CustomerPrivacyPolicyScreen.tsx");

    expect(routeFile).toContain("CustomerPrivacyPolicyScreen");
    expect(designFile).toContain("webPrivacyPolicyPage");
    expect(designFile).toContain("Effective Date: 1 April 2026");
    expect(designFile).toContain("Last Updated: 1 April 2026");
    expect(designFile).toContain("GOGO HOLDING (THAILAND) Company Limited");
    expect(designFile).toContain("This Privacy Policy is intended to help you understand:");
    expect(designFile).toContain("1. Who We Are");
    expect(privacyFile).toContain("PrivacyPolicyArticle");
    expect(privacyFile).toContain("LegalMarkdownBlock");
    expect(privacyFile).toContain("renderLegalInline");
    expect(privacyFile).toContain("legalArticleMaxWidth");
    expect(privacyFile).toContain("legalListItem");
    expect(privacyFile).toContain("CustomerDesktopHeader");
    expect(privacyFile).toContain("CustomerMobileBottomNav");
    expect(privacyFile).toContain("CustomerCookieConsentBanner");
    expect(privacyFile).toContain("CustomerLineOfficialFab");
    expect(privacyFile).toContain("styles.publicLegalPage");
    expect(privacyFile).not.toContain("privacyBluePage");
    expect(privacyFile).not.toContain('backgroundColor: "#DCEEFF"');
    expect(privacyFile).not.toContain("GoGoCash privacy commitments");
    expect(privacyFile).not.toContain("Data we use");
  });

  it("missing orders page > given staging support form > then Expo renders the self service claim flow", () => {
    const routeFile = readMobileFile("app/missing-orders.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webMissingOrdersPage");
    expect(designFile).toContain("Self-service form: add your purchase details");
    expect(designFile).toContain("Get help on LINE");
    expect(designFile).toContain("Your purchase");
    expect(designFile).toContain("Store or marketplace");
    expect(designFile).toContain("Order ID");
    expect(designFile).toContain("Purchase Amount in THB");
    expect(designFile).toContain("Your GoGoCash account");
    expect(designFile).toContain("User ID");
    expect(designFile).toContain("Extra context");
    expect(designFile).toContain("Screenshots or receipts");
    expect(designFile).toContain("How to get");
    expect(designFile).toContain("Cashback");
    expect(designFile).toContain("Team Support");
    expect(designFile).toContain("Need help with cashback? We're here to assist you.");
    expect(routeFile).toContain("CustomerMissingOrdersScreen");
    expect(routeFile).not.toContain("CustomerUtilityScreen");

    const missingOrdersFile = readMobileFile("src/screens/CustomerMissingOrdersScreen.tsx");

    expect(missingOrdersFile).toContain("MissingOrdersSubPage");
    expect(missingOrdersFile).toContain("MissingOrdersTopBar");
    expect(missingOrdersFile).toContain("MissingOrdersFormPanel");
    expect(missingOrdersFile).toContain("MissingOrdersFormSection");
    expect(missingOrdersFile).toContain("MissingOrdersQuickCards");
    expect(missingOrdersFile).toContain("MissingOrdersFaqSection");
    expect(missingOrdersFile).toContain('activeRouteId="profile"');
    expect(missingOrdersFile).toContain('href="/profile"');
    expect(missingOrdersFile).toContain("missingOrdersSurfaceBleed");
    expect(missingOrdersFile).not.toContain("Report order");
    expect(missingOrdersFile).not.toContain("Order evidence");
  });

  it("privacy center page > given staging consent preferences screen > then Expo renders the PDPA optional consent layout", () => {
    const routeFile = readMobileFile("app/privacy-center.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webPrivacyCenterPage");
    expect(designFile).toContain("Privacy center");
    expect(designFile).toContain("Consent preferences");
    expect(designFile).toContain("We collect this information for the stated purpose under PDPA.");
    expect(designFile).toContain("Get the full GoGoCash experience");
    expect(designFile).toContain("Accept all optional consents");
    expect(designFile).toContain("Optional data uses");
    expect(designFile).toContain("Marketing communications");
    expect(designFile).toContain("Analytics");
    expect(designFile).toContain("B2B aggregated insights");
    expect(designFile).toContain("AI credit scoring");
    expect(designFile).toContain("Cashback tracking (required for service)");
    expect(routeFile).toContain("CustomerPrivacyCenterScreen");
    expect(routeFile).not.toContain("CustomerProfileDetailScreen");

    const privacyCenterFile = readMobileFile("src/screens/CustomerPrivacyCenterScreen.tsx");

    expect(privacyCenterFile).toContain("PrivacyCenterSubPage");
    expect(privacyCenterFile).toContain("PrivacyCenterTopBar");
    expect(privacyCenterFile).toContain("ConsentHeroCard");
    expect(privacyCenterFile).toContain("OptionalConsentCard");
    expect(privacyCenterFile).toContain("RequiredConsentCard");
    expect(privacyCenterFile).not.toContain("CheckCircle2");
    expect(privacyCenterFile).not.toContain("CheckIcon");
    expect(privacyCenterFile).toMatch(/heroTitle:[\s\S]*color: colors\.ink/);
    expect(privacyCenterFile).toContain("privacyCenterSurfaceBleed");
    expect(privacyCenterFile).toContain("privacyTintShell");
    expect(privacyCenterFile).toContain('activeRouteId="profile"');
    expect(privacyCenterFile).toContain('href="/profile"');
    expect(privacyCenterFile).toContain("setOptionalConsent");
    expect(privacyCenterFile).not.toContain("Update preferences");
    expect(privacyCenterFile).not.toContain("GoGoTrack history");
    // Light-mode nested cards keep mint soft fills; shell follows themed card surface.
    expect(privacyCenterFile).toMatch(/surface:[\s\S]*backgroundColor: colors\.card/);
    expect(privacyCenterFile).toContain("premiumPanelCardStyle");
    expect(privacyCenterFile).not.toContain('"#DCEEFF"');
    expect(privacyCenterFile).not.toContain('"#10253F"');
    expect(privacyCenterFile).not.toContain('"#B6D3EC"');
  });

  it("favorite brands page > given staging favorite brands screen > then Expo renders the hero and recent brand grid", () => {
    const routeFile = readMobileFile("app/favorite.tsx");
    const designFile = readMobileFile("src/design/webDesignParity.ts");

    expect(designFile).toContain("webFavoriteBrandsPage");
    expect(designFile).toContain("Favorite Brands");
    expect(designFile).toContain("Find Your Brands");
    expect(designFile).toContain(
      "Find your favorite brands, explore new ones, and enjoy cashback on every purchase."
    );
    expect(designFile).toContain("See More");
    expect(designFile).toContain("Recently Visited Brands");
    expect(designFile).toContain("Your Favorite Brands");
    expect(designFile).toContain("Grab Coupon");
    expect(routeFile).toContain("CustomerFavoriteBrandsScreen");
    expect(routeFile).not.toContain("CustomerProfileDetailScreen");

    const favoriteFile = readMobileFile("src/screens/CustomerFavoriteBrandsScreen.tsx");

    expect(favoriteFile).toContain("FavoriteBrandsSubPage");
    expect(favoriteFile).toContain("FavoriteBrandsTopBar");
    expect(favoriteFile).toContain("RecentlyVisitedBrandsGrid");
    // Final-form alignment 2026-07-11: the grid renders the shared BrandCard
    // (category chip + heart are BrandCard options), no local clone.
    expect(favoriteFile).toContain("<BrandCard");
    expect(favoriteFile).not.toContain("FavoriteBrandCard");
    // Hero redesign 2026-07-11: the hero lives in its own component (the old
    // inline hero + illustration filled a whole phone screen before any
    // brands appeared), and the 32pt page title renders on DESKTOP only —
    // mobile already shows the title in the top bar.
    expect(favoriteFile).toContain('from "@mobile/components/FavoriteBrandsHero"');
    expect(favoriteFile).toMatch(/\{isDesktop \? \(\s*<Text style=\{styles\.pageTitle\}/);
    expect(favoriteFile).toMatch(/pageTitle:[\s\S]*fontSize: 32,[\s\S]*lineHeight: 40/);
    expect(favoriteFile).toContain("favoriteBrandsSurfaceBleed");
    expect(favoriteFile).toContain("favoriteShell");

    const heroFile = readMobileFile("src/components/FavoriteBrandsHero.tsx");
    // Compact mobile banner: text + small illustration in ONE ROW (~ a third
    // of the old height); desktop keeps the generous web-parity hero.
    expect(heroFile).toContain("favoriteHeroLogoImage");
    expect(heroFile).toContain("favoriteHeroBagImage");
    expect(heroFile).toContain("heroCardDesktop");
    expect(heroFile).toMatch(/heroCard: \{[\s\S]*?flexDirection: "row"/);
    expect(heroFile).toMatch(/heroBag:[\s\S]*height: 96/);
    expect(heroFile).toMatch(/heroBagDesktop:[\s\S]*height: 200/);
    // The GO logo is desktop-only chrome; mobile spends the space on content.
    expect(heroFile).toMatch(/\{isDesktop \? \(\s*<Image[\s\S]*?favoriteHeroLogoImage/);
    expect(favoriteFile).not.toContain('"#DCEEFF"');
    expect(favoriteFile).not.toContain("favoriteBlueShell");
    expect(favoriteFile).toContain('activeRouteId="profile"');
    expect(favoriteFile).toContain('href="/profile"');
    expect(heroFile).toContain('href="/shops"');
    expect(favoriteFile).not.toContain("No favorite brands yet");
    expect(favoriteFile).not.toContain("Browse partners");
  });
});
