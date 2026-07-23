import { Link, usePathname } from "expo-router";
import {
  Banknote as BanknoteIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ExternalLink as ExternalLinkIcon,
  Hourglass as HourglassIcon,
  Info as InfoIcon,
  LogOut as LogOutIcon,
  WalletCards as WalletCardsIcon,
} from "@mobile/theme/icons";
import { useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { MaskedUserIdRow } from "@mobile/components/MaskedUserIdRow";
import { getProfileMenuIcon } from "@mobile/components/profileMenuIcons";
import { LogoutConfirmCard } from "@mobile/components/LogoutConfirmCard";
import { useCopy } from "@mobile/i18n/useCopy";
import { useMobileLogout } from "@mobile/auth/useMobileLogout";
import { normalizePathname } from "@mobile/auth/routeGuard";
import {
  isProfileMenuItemActive,
  isProfileSectionPath,
  isProfileSubNavItemActive,
  shouldAutoExpandProfileSubNav,
} from "@mobile/navigation/profileSectionNav";
import { GoGoPassAvatar } from "@mobile/components/GoGoPassAvatar";
import { ProfileAvatarImage } from "@mobile/components/ProfileAvatarImage";
import { GoGoPassBadge } from "@mobile/components/GoGoPassBadge";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { CustomerGoLinkScreen } from "@mobile/screens/CustomerGoLinkScreen";
import { filterHiddenProfileMenuItems } from "@mobile/config/featureFlags";
import {
  getAccountShellFrameMetrics,
  getDesktopShellOffset,
  mobileShellLayout,
  profileHubMenuItems,
  profileHubSubNavItems,
  webAccountPageSurface,
  webProfileWalletHeroSurface,
  webProfileWalletSummary,
  webWalletSummaryMetrics,
} from "@mobile/design/webDesignParity";
import { useMemo } from "react";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces, type ThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

export type AccountRouteId = "wallet" | "quest" | "profile";
type WalletMetric = (typeof webWalletSummaryMetrics)[number];

const walletHeroGlassGradientStyle = {
  backgroundImage: webProfileWalletHeroSurface.glassBackgroundImage,
} as unknown as ViewStyle;

export function AccountPageShell({
  activeRouteId,
  children,
  showProfileRail = false,
  showTitle = true,
  tabletContentMode = "capped",
  title,
}: {
  activeRouteId: AccountRouteId;
  children: ReactNode;
  showProfileRail?: boolean;
  showTitle?: boolean;
  /**
   * Tablet (768-1023px) content width strategy. "capped" (default) centers the
   * content within a tablet max-width so single-column screens don't stretch.
   * "fluid" keeps the full-bleed frame for screens whose content is sized from
   * the raw viewport width (e.g. Quest's grids).
   */
  tabletContentMode?: "capped" | "fluid";
  title: string;
}) {
  const styles = useAccountPageShellStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [goLinkSheetOpen, setGoLinkSheetOpen] = useState(false);
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const showBottomNav = !isDesktop;
  const pathname = normalizePathname(usePathname() ?? "/");
  // Desktop: every profile-section route renders the persistent sidebar (rail),
  // not just the hub screens that explicitly opt in via showProfileRail.
  const showDesktopRail = isDesktop && (showProfileRail || isProfileSectionPath(pathname));
  const useDesktopHomepageFooter = isDesktop && !showDesktopRail;
  const useDesktopFullBleedChrome = isDesktop && (useDesktopHomepageFooter || showDesktopRail);
  // The rounded surface card wraps content whenever the rail shows, plus the
  // mobile hub screens (profile/wallet) that opt in via showProfileRail.
  const useProfileSurface = showDesktopRail || (!isDesktop && showProfileRail);
  // Profile/account-section pages (those with the desktop rail) adopt the navbar
  // shell's width + gutter so the user-section card lines up with the header logo
  // (left) and globe (right). Quest (no rail) keeps the legacy 1180/16 frame its
  // internal hero/grid math depends on.
  const frameMetrics = getAccountShellFrameMetrics(width, {
    alignToNavbarShell: showDesktopRail,
    tabletFluid: tabletContentMode === "fluid",
  });
  // Rail and quest desktop pages use full-bleed scroll so the footer can break out to
  // the viewport edge; only mobile/tablet non-rail layouts keep the legacy padded frame.
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);

  const profileSurfaceBlock = (
    <View
      style={[
        styles.profileSurface,
        isDesktop ? styles.profileSurfaceDesktop : styles.profileSurfaceMobile,
      ]}
    >
      {showDesktopRail ? <DesktopProfileRail /> : null}
      <View
        style={[
          styles.profileContent,
          isDesktop
            ? styles.profileContentDesktop
            : [styles.profileContentMobile, styles.profileContentMobileInner],
        ]}
      >
        {showTitle ? (
          <Text style={[styles.mobileTitle, isDesktop ? styles.desktopSrTitle : null]}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.viewport}>
      <View style={[styles.frame, useDesktopFullBleedChrome ? null : { maxWidth: frameMetrics.maxWidth }]}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            isDesktop ? null : styles.pageMinFill,
            useDesktopFullBleedChrome ? styles.pageDesktopFullBleed : null,
            {
              paddingBottom: showBottomNav
                ? mobileShellLayout.bottomNavClearance + 18
                : 0,
              paddingHorizontal: useDesktopFullBleedChrome ? 0 : frameMetrics.paddingHorizontal,
              paddingTop: Math.max(spacing.md, insets.top + spacing.md),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {useProfileSurface ? (
            showDesktopRail && isDesktop ? (
              <View
                style={[
                  styles.desktopContentCap,
                  {
                    maxWidth: frameMetrics.maxWidth,
                    paddingHorizontal: frameMetrics.paddingHorizontal,
                  },
                ]}
              >
                {profileSurfaceBlock}
              </View>
            ) : (
              profileSurfaceBlock
            )
          ) : (
            <View
              style={[
                styles.questContent,
                useDesktopHomepageFooter
                  ? [
                      styles.questContentDesktopCap,
                      {
                        maxWidth: frameMetrics.maxWidth,
                        paddingHorizontal: frameMetrics.paddingHorizontal,
                      },
                    ]
                  : null,
              ]}
            >
              {children}
            </View>
          )}
          {isDesktop ? (
            <View
              style={[
                styles.desktopHomepageFooterCap,
                { maxWidth: mobileShellLayout.desktopContentMaxWidth },
              ]}
            >
              <CustomerDesktopFooter
                horizontalPadding={desktopFooterHorizontalOffset}
                viewportWidth={width}
              />
            </View>
          ) : null}
        </ScrollView>
        {goLinkSheetOpen ? (
          <CustomerGoLinkScreen
            onClose={() => setGoLinkSheetOpen(false)}
            presentation="homeSheet"
          />
        ) : null}
        {showBottomNav ? (
          <CustomerMobileBottomNav
            activeRouteId={activeRouteId}
            bottomInset={insets.bottom}
            onGoLinkPress={() => setGoLinkSheetOpen(true)}
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * Persistent desktop profile sidebar (web parity with `SubProfile`). Renders the
 * full menu, the "Profile" accordion sub-nav, external links (new tab), and Log
 * Out. Active state is derived from the current route via `usePathname`.
 */
function DesktopProfileRail() {
  const styles = useAccountPageShellStyles();
  const { colors } = useTheme();
  const tc = useCopy();
  const pathname = normalizePathname(usePathname() ?? "/");
  const [profileSubOpen, setProfileSubOpen] = useState(() => shouldAutoExpandProfileSubNav(pathname));
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { logout, pending: logoutPending } = useMobileLogout();

  return (
    <View style={styles.desktopRail}>
      {filterHiddenProfileMenuItems(profileHubMenuItems).map((item) => {
        const isExternal = "external" in item && item.external === true;
        const active = isProfileMenuItemActive(item, pathname);
        const label = tc(item.label);
        const Icon = getProfileMenuIcon(item.label);
        const iconColor = active ? colors.white : colors.primaryDark;

        // "Profile" is an accordion that reveals the hub sub-nav.
        if (item.href === "/profile") {
          return (
            <View key={item.label} style={styles.railAccordion}>
              <MotionPressable
                accessibilityRole="button"
                accessibilityState={{ expanded: profileSubOpen }}
                onPress={() => setProfileSubOpen((open) => !open)}
                pressScale={0.98}
                style={StyleSheet.flatten([styles.railRow, active ? styles.railRowActive : null])}
              >
                <Icon color={iconColor} size={22} strokeWidth={typography.iconStrokeWidth} />
                <Text style={[styles.railLabel, active ? styles.railLabelActive : null]}>{label}</Text>
                {profileSubOpen ? (
                  <ChevronUpIcon color={iconColor} size={20} strokeWidth={typography.iconStrokeWidth} />
                ) : (
                  <ChevronDownIcon color={iconColor} size={20} strokeWidth={typography.iconStrokeWidth} />
                )}
              </MotionPressable>
              {profileSubOpen ? (
                <View style={styles.railSubNav}>
                  {filterHiddenProfileMenuItems(profileHubSubNavItems).map((sub) => {
                    const subActive = isProfileSubNavItemActive(pathname, sub.href);
                    return (
                      <Link asChild href={sub.href as never} key={sub.href}>
                        <MotionPressable
                          pressScale={0.98}
                          style={StyleSheet.flatten([
                            styles.railSubRow,
                            subActive ? styles.railSubRowActive : null,
                          ])}
                        >
                          <Text style={[styles.railSubLabel, subActive ? styles.railSubLabelActive : null]}>
                            {tc(sub.label)}
                          </Text>
                        </MotionPressable>
                      </Link>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        }

        // External destinations open in a new tab and are never "active".
        if (isExternal) {
          return (
            <Link
              asChild
              href={item.href as never}
              key={item.label}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MotionPressable pressScale={0.98} style={styles.railRow}>
                <Icon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
                <Text style={styles.railLabel}>{label}</Text>
                <ExternalLinkIcon
                  color={colors.primaryDark}
                  size={16}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </MotionPressable>
            </Link>
          );
        }

        return (
          <Link asChild href={item.href as never} key={item.label}>
            <MotionPressable
              pressScale={0.98}
              style={StyleSheet.flatten([styles.railRow, active ? styles.railRowActive : null])}
            >
              <Icon color={iconColor} size={22} strokeWidth={typography.iconStrokeWidth} />
              <Text style={[styles.railLabel, active ? styles.railLabelActive : null]}>{label}</Text>
            </MotionPressable>
          </Link>
        );
      })}

      <MotionPressable
        accessibilityLabel={tc("Log Out")}
        accessibilityRole="button"
        onPress={() => setLogoutConfirmOpen(true)}
        pressScale={0.98}
        style={styles.railRow}
      >
        <LogOutIcon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.railLabel}>{tc("Log Out")}</Text>
      </MotionPressable>
      {logoutConfirmOpen ? (
        <LogoutConfirmCard
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={logout}
          pending={logoutPending}
        />
      ) : null}
    </View>
  );
}

const COMPACT_WALLET_HERO_MAX_WIDTH = 560;
const COMPACT_WALLET_AVATAR_SIZE = 56;
const DESKTOP_WALLET_AVATAR_SIZE = 72;

export function AccountWalletHeroCard({
  amount = "0.00",
  avatarUrl,
  currency = "USD",
  lastUpdated = null,
  maskedId = "****",
  tier,
  title = "USER",
  userId = webProfileWalletSummary.userId,
}: {
  amount?: string;
  avatarUrl?: string | null;
  currency?: string;
  lastUpdated?: string | null;
  maskedId?: string;
  tier?: string;
  title?: string;
  userId?: string;
}) {
  const styles = useAccountPageShellStyles();
  const { colors } = useTheme();
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_WALLET_HERO_MAX_WIDTH;
  const avatarSize = isCompact ? COMPACT_WALLET_AVATAR_SIZE : DESKTOP_WALLET_AVATAR_SIZE;

  return (
    <View style={styles.walletHeroCard}>
      <View style={[styles.walletHeroTopBand, isCompact ? styles.walletHeroTopBandCompact : null]}>
        <View style={[styles.walletHeroHeader, isCompact ? styles.walletHeroHeaderCompact : null]}>
          <GoGoPassAvatar size={avatarSize} tier={tier}>
            <ProfileAvatarImage
              accessibilityLabel={tc("Profile avatar")}
              avatarUrl={avatarUrl}
              size={avatarSize}
              style={[styles.walletAvatar, { height: avatarSize, width: avatarSize }]}
            />
          </GoGoPassAvatar>
          <View style={[styles.walletHeroUser, isCompact ? styles.walletHeroUserCompact : null]}>
            {isCompact ? (
              <View style={styles.walletHeroIdentityCompact}>
                <Text numberOfLines={2} style={[styles.walletHeroName, styles.walletHeroNameCompact]}>
                  {title}
                </Text>
                <GoGoPassBadge tier={tier} />
              </View>
            ) : (
              <>
                <View style={styles.walletHeroNameRow}>
                  <GoGoPassBadge tier={tier} />
                  <Text style={styles.walletHeroName}>{title}</Text>
                </View>
                <MaskedUserIdRow
                  iconColor="rgba(255,255,255,0.95)"
                  label={tc("User ID")}
                  labelStyle={styles.walletHeroIdLabel}
                  maskedId={maskedId}
                  rowStyle={[styles.walletHeroIdChip, styles.walletHeroIdRow]}
                  textStyle={styles.walletHeroId}
                  userId={userId}
                />
              </>
            )}
          </View>
        </View>
        {isCompact ? (
          <MaskedUserIdRow
            iconColor="rgba(255,255,255,0.95)"
            label={tc("User ID")}
            labelStyle={styles.walletHeroIdLabel}
            maskedId={maskedId}
            rowStyle={[styles.walletHeroIdChip, styles.walletHeroIdRowCompact]}
            textStyle={styles.walletHeroId}
            userId={userId}
          />
        ) : null}
        <View
          style={[
            styles.walletHeroGlassPanel,
            isCompact ? styles.walletHeroGlassPanelCompact : null,
            walletHeroGlassGradientStyle,
          ]}
        >
          <Text style={styles.walletKicker}>{tc("Total Cashback Available")}</Text>
          <View style={styles.walletAmountRow}>
            <Text style={[styles.walletAmount, isCompact ? styles.walletAmountCompact : null]}>
              {amount}
            </Text>
            <Text style={[styles.walletCurrency, isCompact ? styles.walletCurrencyCompact : null]}>
              {currency}
            </Text>
          </View>
          {lastUpdated ? <Text style={styles.walletUpdated}>{lastUpdated}</Text> : null}
          <Link asChild href="/withdraw">
            <MotionPressable
              pressScale={0.98}
              style={StyleSheet.flatten([
                styles.walletWithdrawButton,
                isCompact ? styles.walletWithdrawButtonCompact : null,
              ])}
            >
              <Text
                style={[
                  styles.walletWithdrawText,
                  isCompact ? styles.walletWithdrawTextCompact : null,
                ]}
              >
                {tc("Withdraw")}
              </Text>
              <ExternalLinkIcon
                color={colors.white}
                size={16}
                strokeWidth={typography.iconStrokeWidth}
              />
            </MotionPressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

export function CashbackSummaryBreakdown() {
  const styles = useAccountPageShellStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.cashbackSummaryCard}>
      <View style={styles.cashbackSummaryHeader}>
        <View style={styles.cashbackSummaryCopy}>
          <Text style={styles.cashbackSummaryTitle}>Cashback Summary</Text>
          <Text style={styles.cashbackSummarySubtitle}>
            A simple snapshot of your rewards — what we track, what is confirming, and what you have
            already received.
          </Text>
        </View>
        <View style={styles.cashbackHelpIcon}>
          <InfoIcon color={colors.muted} size={22} strokeWidth={typography.iconStrokeWidth} />
        </View>
      </View>
      <View style={styles.metricStack}>
        {webWalletSummaryMetrics.map((metric, index) => (
          <CashbackMetricTile key={metric.label} metric={metric} primary={index === 0} />
        ))}
      </View>
    </View>
  );
}

function CashbackMetricTile({ metric, primary }: { metric: WalletMetric; primary?: boolean }) {
  const styles = useAccountPageShellStyles();
  const { colors } = useTheme();
  const Icon = primary
    ? WalletCardsIcon
    : metric.label === "Pending Cashback"
      ? HourglassIcon
      : BanknoteIcon;

  return (
    <View style={[styles.metricTile, primary ? styles.metricTilePrimary : null]}>
      <View style={styles.metricIcon}>
        <Icon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricTitle}>{metric.label}</Text>
        <Text style={styles.metricHint}>{metric.hint}</Text>
      </View>
      <View style={styles.metricAmountWrap}>
        <Text style={styles.metricAmount}>{metric.amount}</Text>
        <Text style={styles.metricCurrency}>{metric.currency}</Text>
      </View>
    </View>
  );
}

function useAccountPageShellStyles() {
  const { colors, resolved } = useTheme();
  return useMemo(
    () => createAccountPageShellStyles(colors, getThemeSurfaces(colors, resolved)),
    [colors, resolved]
  );
}


function createAccountPageShellStyles(colors: ThemeColors, surfaces: ThemeSurfaces) {
  // Frosted wallet glass stays light in every theme; body copy stays #3B3B3B.
  const walletGlassInk = "#3B3B3B";

  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  frame: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
    width: "100%",
  },
  page: {},
  pageMinFill: {
    minHeight: "100%",
  },
  pageDesktopFullBleed: {
    paddingHorizontal: 0,
  },
  desktopContentCap: {
    alignSelf: "center",
    flexGrow: 0,
    width: "100%",
  },
  profileSurface: {
    borderColor: colors.border,
    borderRadius: webAccountPageSurface.cardRadius,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    width: "100%",
  },
  profileSurfaceMobile: {
    backgroundColor: surfaces.profileSurfaceMobile,
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    padding: 8,
  },
  profileSurfaceDesktop: {
    backgroundColor: colors.card,
    boxShadow: shadows.cardCss,
  },
  desktopRail: {
    borderColor: colors.border,
    borderRightWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    width: webAccountPageSurface.railWidth,
  },
  railRow: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  railRowActive: {
    backgroundColor: colors.primary,
  },
  railLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    // Web parity: SubProfile menu rows use `text-base` (16px) + leading-normal.
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  railLabelActive: {
    // Selected rail item: white text on the green pill, but normal weight (not bold) —
    // inherits railLabel's typography.bodyWeight.
    color: colors.white,
  },
  railAccordion: {
    gap: spacing.sm,
  },
  railSubNav: {
    gap: spacing.xs,
    paddingLeft: spacing.lg,
  },
  railSubRow: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  railSubRowActive: {
    backgroundColor: colors.primary,
  },
  railSubLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    // Web parity: SubProfile accordion sub-items use `text-sm` (14px).
    fontSize: typography.label,
    fontWeight: typography.bodyWeight,
    lineHeight: 20,
  },
  railSubLabelActive: {
    // Selected sub-nav item: white text, normal weight (not bold).
    color: colors.white,
  },
  profileContent: {
    flex: 1,
    gap: spacing.lg,
    minWidth: 0,
  },
  profileContentMobile: {
    gap: spacing.md,
  },
  profileContentMobileInner: {
    backgroundColor: surfaces.profileContentInner,
    borderRadius: 24,
    padding: 16,
  },
  profileContentDesktop: {
    padding: spacing.md,
  },
  mobileTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0,
  },
  desktopSrTitle: {
    height: 0,
    overflow: "hidden",
  },
  questContent: {
    gap: spacing.lg,
    width: "100%",
  },
  questContentDesktopCap: {
    alignSelf: "center",
  },
  desktopHomepageFooterCap: {
    alignSelf: "center",
    width: "100%",
  },
  walletHeroCard: {
    backgroundColor: webProfileWalletHeroSurface.outerColor,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: "0 4px 24px rgba(12,20,18,0.12)",
    overflow: "hidden",
    width: "100%",
  },
  walletHeroTopBand: {
    backgroundColor: webProfileWalletHeroSurface.headerColor,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  walletHeroTopBandCompact: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  walletHeroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 86,
    paddingBottom: spacing.sm,
  },
  walletHeroHeaderCompact: {
    // 0, not undefined — RN style merging SKIPS undefined, so the desktop
    // minHeight (86) silently survived and forced a dead gap under the name.
    minHeight: 0,
    paddingBottom: spacing.xs,
  },
  walletAvatar: {
    // Fallback tint behind transparent regions of the avatar PNG. The circular crop is
    // owned by ProfileAvatarImage, so no borderRadius here.
    backgroundColor: "#FFDDE7",
  },
  walletHeroUser: {
    alignItems: "flex-end",
    flex: 1,
    minWidth: 0,
  },
  walletHeroUserCompact: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  walletHeroIdentityCompact: {
    gap: 6,
    minWidth: 0,
    width: "100%",
  },
  walletHeroNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  walletHeroName: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
  },
  walletHeroNameCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  // Redesign 2026-07-11 (founder): the ID was 58%-alpha text lost on the green
  // band — now a labeled chip with solid-white value so it reads at a glance.
  walletHeroId: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: typography.labelWeight,
  },
  // Round 2 (founder): quiet chip — content-hugging, borderless, small type.
  walletHeroIdChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.chip,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  walletHeroIdLabel: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: typography.labelWeight,
    letterSpacing: 0.3,
  },
  walletHeroIdRow: {
    marginTop: spacing.sm,
    maxWidth: "100%",
  },
  walletHeroIdRowCompact: {
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  walletHeroGlassPanel: {
    alignItems: "center",
    backgroundColor: webProfileWalletHeroSurface.glassFallbackColor,
    borderColor: webProfileWalletHeroSurface.glassBorderColor,
    borderRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    boxShadow: "0 4px 24px rgba(24, 97, 144, 0.12)",
    gap: spacing.sm,
    marginHorizontal: -18,
    marginTop: -10,
    minHeight: 260,
    overflow: "hidden",
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 24,
  },
  walletHeroGlassPanelCompact: {
    marginHorizontal: -14,
    marginTop: -6,
    // 0, not undefined — same skip-merge pitfall as the header: the desktop
    // minHeight (260) survived and left ~70px of empty gradient below the
    // Withdraw button on phones.
    minHeight: 0,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  walletKicker: {
    color: walletGlassInk,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: typography.bodyWeight,
    textAlign: "center",
  },
  walletAmountRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.xs,
  },
  walletAmount: {
    color: walletGlassInk,
    fontFamily: typography.family,
    fontSize: 48,
    fontWeight: "600",
    lineHeight: 56,
  },
  walletAmountCompact: {
    fontSize: 36,
    lineHeight: 42,
  },
  walletCurrency: {
    color: walletGlassInk,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    paddingBottom: 7,
  },
  walletCurrencyCompact: {
    fontSize: 16,
    paddingBottom: 4,
  },
  walletUpdated: {
    color: walletGlassInk,
    fontFamily: typography.family,
    fontSize: 14,
  },
  walletWithdrawButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 60,
    paddingHorizontal: 28,
    width: "100%",
  },
  walletWithdrawButtonCompact: {
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  walletWithdrawText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
  },
  walletWithdrawTextCompact: {
    fontSize: 17,
  },
  cashbackSummaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
  },
  cashbackSummaryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  cashbackSummaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cashbackSummaryTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "600",
  },
  cashbackSummarySubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  cashbackHelpIcon: {
    paddingTop: 2,
  },
  metricStack: {
    gap: spacing.md,
  },
  metricTile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  metricTilePrimary: {
    backgroundColor: surfaces.metricTilePrimaryBackground,
    borderColor: surfaces.metricTilePrimaryBorder,
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: surfaces.metricIconBackground,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  metricCopy: {
    flex: 1,
    gap: 3,
  },
  metricTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  metricHint: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 11,
    lineHeight: 15,
  },
  metricAmountWrap: {
    alignItems: "flex-end",
  },
  metricAmount: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "600",
  },
  metricCurrency: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "500",
  },
});
}
