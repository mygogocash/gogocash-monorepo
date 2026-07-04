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
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { getProfileMenuIcon } from "@mobile/components/profileMenuIcons";
import { LogoutConfirmCard } from "@mobile/components/LogoutConfirmCard";
import { useCopy } from "@mobile/i18n/useCopy";
import { useMobileLogout } from "@mobile/auth/useMobileLogout";
import {
  isGoGoTrackSubNavItemActive,
  isProfileMenuItemActive,
  isProfileSectionPath,
  isProfileSubNavItemActive,
  shouldAutoExpandGoGoTrackSubNav,
  shouldAutoExpandProfileSubNav,
} from "@mobile/navigation/profileSectionNav";
import profileAvatarImage from "../../assets/profile-avatar.png";
import { GoGoPassAvatar } from "@mobile/components/GoGoPassAvatar";
import { GoGoPassBadge } from "@mobile/components/GoGoPassBadge";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import {
  getAccountShellFooterHorizontalPadding,
  getAccountShellFrameMetrics,
  getDesktopShellOffset,
  mobileShellLayout,
  profileHubMenuItems,
  profileHubGoGoTrackSubNavItems,
  profileHubSubNavItems,
  webAccountPageSurface,
  webProfileWalletHeroSurface,
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
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const showBottomNav = !isDesktop;
  const pathname = usePathname();
  // Desktop: every profile-section route renders the persistent sidebar (rail),
  // not just the hub screens that explicitly opt in via showProfileRail.
  const showDesktopRail = isDesktop && (showProfileRail || isProfileSectionPath(pathname));
  const useDesktopHomepageFooter = isDesktop && !showDesktopRail;
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
  // Rail pages keep the footer inside the padded account frame, so they need an
  // offset back past the frame's centering gap + content padding. Quest/non-rail
  // desktop pages use the same full-width footer placement as the homepage.
  const footerHorizontalPadding = getAccountShellFooterHorizontalPadding(width, {
    alignToNavbarShell: showDesktopRail,
  });
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);

  return (
    <View style={styles.viewport}>
      <View style={[styles.frame, useDesktopHomepageFooter ? null : { maxWidth: frameMetrics.maxWidth }]}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            {
              paddingBottom: showBottomNav
                ? mobileShellLayout.bottomNavClearance + 18
                : mobileShellLayout.desktopBottomClearance,
              paddingHorizontal: useDesktopHomepageFooter ? 0 : frameMetrics.paddingHorizontal,
              paddingTop: Math.max(spacing.md, insets.top + spacing.md),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {useProfileSurface ? (
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
          {useDesktopHomepageFooter ? (
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
          ) : (
            <CustomerDesktopFooterSlot
              horizontalPadding={footerHorizontalPadding}
              style={styles.desktopFooter}
            />
          )}
        </ScrollView>
        {showBottomNav ? (
          <CustomerMobileBottomNav activeRouteId={activeRouteId} bottomInset={insets.bottom} />
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
  const pathname = usePathname();
  const [profileSubOpen, setProfileSubOpen] = useState(() => shouldAutoExpandProfileSubNav(pathname));
  const [goGoTrackSubOpen, setGoGoTrackSubOpen] = useState(() =>
    shouldAutoExpandGoGoTrackSubNav(pathname),
  );
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { logout, pending: logoutPending } = useMobileLogout();

  return (
    <View style={styles.desktopRail}>
      {profileHubMenuItems.map((item) => {
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
                  {profileHubSubNavItems.map((sub) => {
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

        // GoGoTrack is an accordion that reveals setup / timeline / settings sub-nav.
        if (item.href === "/gototrack") {
          return (
            <View key={item.label} style={styles.railAccordion}>
              <MotionPressable
                accessibilityRole="button"
                accessibilityState={{ expanded: goGoTrackSubOpen }}
                onPress={() => setGoGoTrackSubOpen((open) => !open)}
                pressScale={0.98}
                style={StyleSheet.flatten([styles.railRow, active ? styles.railRowActive : null])}
              >
                <Icon color={iconColor} size={22} strokeWidth={typography.iconStrokeWidth} />
                <Text style={[styles.railLabel, active ? styles.railLabelActive : null]}>{label}</Text>
                {goGoTrackSubOpen ? (
                  <ChevronUpIcon color={iconColor} size={20} strokeWidth={typography.iconStrokeWidth} />
                ) : (
                  <ChevronDownIcon color={iconColor} size={20} strokeWidth={typography.iconStrokeWidth} />
                )}
              </MotionPressable>
              {goGoTrackSubOpen ? (
                <View style={styles.railSubNav}>
                  {profileHubGoGoTrackSubNavItems.map((sub) => {
                    const subActive = isGoGoTrackSubNavItemActive(pathname, sub.href);
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

export function AccountWalletHeroCard({
  amount = "0.00",
  currency = "USD",
  lastUpdated = "Last Updated: -",
  maskedId = "****",
  tier,
  title = "USER",
}: {
  amount?: string;
  currency?: string;
  lastUpdated?: string;
  maskedId?: string;
  tier?: string;
  title?: string;
}) {
  const styles = useAccountPageShellStyles();
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.walletHeroCard}>
      <View style={styles.walletHeroTopBand}>
        <View style={styles.walletHeroHeader}>
          <GoGoPassAvatar size={72} tier={tier}>
            <Image
              alt={tc("Profile avatar")}
              source={profileAvatarImage}
              style={[styles.walletAvatar, styles.walletAvatarLarge]}
            />
          </GoGoPassAvatar>
          <View style={styles.walletHeroUser}>
            <View style={styles.walletHeroNameRow}>
              <GoGoPassBadge tier={tier} />
              <Text style={styles.walletHeroName}>{title}</Text>
            </View>
            <Text style={styles.walletHeroId}>{maskedId}</Text>
          </View>
        </View>
        <View style={[styles.walletHeroGlassPanel, walletHeroGlassGradientStyle]}>
          <Text style={styles.walletKicker}>{tc("Total Cashback Available")}</Text>
          <View style={styles.walletAmountRow}>
            <Text style={styles.walletAmount}>{amount}</Text>
            <Text style={styles.walletCurrency}>{currency}</Text>
          </View>
          <Text style={styles.walletUpdated}>{lastUpdated}</Text>
          <Link asChild href="/withdraw">
            <MotionPressable pressScale={0.98} style={styles.walletWithdrawButton}>
              <Text style={styles.walletWithdrawText}>{tc("Withdraw")}</Text>
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
  page: {
    minHeight: "100%",
  },
  desktopFooter: {
    marginTop: 64,
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
  walletHeroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 86,
    paddingBottom: spacing.sm,
  },
  walletAvatar: {
    backgroundColor: "#FFDDE7",
    borderRadius: radii.chip,
  },
  walletAvatarLarge: {
    height: 72,
    width: 72,
  },
  walletHeroUser: {
    alignItems: "flex-end",
    flex: 1,
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
  walletHeroId: {
    color: "rgba(255,255,255,0.58)",
    fontFamily: typography.family,
    fontSize: 15,
    marginTop: spacing.sm,
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
  walletCurrency: {
    color: walletGlassInk,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    paddingBottom: 7,
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
  walletWithdrawText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
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
