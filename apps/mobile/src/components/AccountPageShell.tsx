import { Link } from "expo-router";
import {
  Banknote as BanknoteIcon,
  ExternalLink as ExternalLinkIcon,
  Hourglass as HourglassIcon,
  Info as InfoIcon,
  WalletCards as WalletCardsIcon,
} from "lucide-react-native";
import type { ReactNode } from "react";
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
import profileAvatarImage from "../../assets/profile-avatar.png";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import {
  mobileShellLayout,
  profileHubMenuItems,
  webAccountPageSurface,
  webProfileWalletHeroSurface,
  webWalletSummaryMetrics,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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
  title,
}: {
  activeRouteId: AccountRouteId;
  children: ReactNode;
  showProfileRail?: boolean;
  showTitle?: boolean;
  title: string;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const showBottomNav = !isDesktop;

  return (
    <View style={styles.viewport}>
      <View
        style={[
          styles.frame,
          {
            maxWidth: isDesktop
              ? webAccountPageSurface.desktopContentMaxWidth
              : mobileShellLayout.contentMaxWidth,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.page,
            {
              paddingBottom: showBottomNav
                ? mobileShellLayout.bottomNavClearance + 18
                : mobileShellLayout.desktopBottomClearance,
              paddingHorizontal: isDesktop
                ? mobileShellLayout.desktopContentHorizontalPadding
                : mobileShellLayout.contentHorizontalPadding,
              paddingTop: Math.max(spacing.md, insets.top + spacing.md),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {showProfileRail ? (
            <View
              style={[
                styles.profileSurface,
                isDesktop ? styles.profileSurfaceDesktop : styles.profileSurfaceMobile,
              ]}
            >
              {isDesktop ? <DesktopProfileRail activeRouteId={activeRouteId} /> : null}
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
            <View style={styles.questContent}>{children}</View>
          )}
          <CustomerDesktopFooterSlot style={styles.desktopFooter} />
        </ScrollView>
        {showBottomNav ? (
          <CustomerMobileBottomNav activeRouteId={activeRouteId} bottomInset={insets.bottom} />
        ) : null}
      </View>
    </View>
  );
}

function DesktopProfileRail({ activeRouteId }: { activeRouteId: AccountRouteId }) {
  return (
    <View style={styles.desktopRail}>
      {profileHubMenuItems.slice(0, 9).map((item) => {
        const active =
          activeRouteId === "wallet"
            ? item.href === "/wallet"
            : activeRouteId === "profile"
              ? item.href === "/profile"
              : false;

        return (
          <Link asChild href={item.href as never} key={item.label}>
            <MotionPressable
              pressScale={0.98}
              style={StyleSheet.flatten([styles.railRow, active ? styles.railRowActive : null])}
            >
              <Text style={[styles.railDot, active ? styles.railDotActive : null]}>
                {item.label.slice(0, 1)}
              </Text>
              <Text style={[styles.railLabel, active ? styles.railLabelActive : null]}>
                {item.label}
              </Text>
            </MotionPressable>
          </Link>
        );
      })}
    </View>
  );
}

export function AccountWalletHeroCard({
  amount = "0.00",
  currency = "USD",
  lastUpdated = "Last Updated: -",
  maskedId = "****",
  title = "USER",
}: {
  amount?: string;
  currency?: string;
  lastUpdated?: string;
  maskedId?: string;
  title?: string;
}) {
  return (
    <View style={styles.walletHeroCard}>
      <View style={styles.walletHeroTopBand}>
        <View style={styles.walletHeroHeader}>
          <Image
            alt="Profile avatar"
            source={profileAvatarImage}
            style={[styles.walletAvatar, styles.walletAvatarLarge]}
          />
          <View style={styles.walletHeroUser}>
            <Text style={styles.walletHeroName}>{title}</Text>
            <Text style={styles.walletHeroId}>{maskedId}</Text>
          </View>
        </View>
        <View style={[styles.walletHeroGlassPanel, walletHeroGlassGradientStyle]}>
          <Text style={styles.walletKicker}>Total Cashback Available</Text>
          <View style={styles.walletAmountRow}>
            <Text style={styles.walletAmount}>{amount}</Text>
            <Text style={styles.walletCurrency}>{currency}</Text>
          </View>
          <Text style={styles.walletUpdated}>{lastUpdated}</Text>
          <Link asChild href="/withdraw">
            <MotionPressable pressScale={0.98} style={styles.walletWithdrawButton}>
              <Text style={styles.walletWithdrawText}>Withdraw</Text>
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

const styles = StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: webAccountPageSurface.shellBackground,
    flex: 1,
  },
  frame: {
    backgroundColor: webAccountPageSurface.shellBackground,
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
    borderColor: webAccountPageSurface.surfaceBorderColor,
    borderRadius: webAccountPageSurface.cardRadius,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    width: "100%",
  },
  profileSurfaceMobile: {
    backgroundColor: "rgba(255,255,255,0.9)",
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
  railDot: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
    width: 24,
  },
  railDotActive: {
    color: colors.white,
  },
  railLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
  },
  railLabelActive: {
    color: colors.white,
    fontWeight: "600",
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
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 24,
    padding: 16,
  },
  profileContentDesktop: {
    padding: spacing.md,
  },
  mobileTitle: {
    color: webAccountPageSurface.titleColor,
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
    color: colors.ink,
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
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 48,
    fontWeight: "600",
    lineHeight: 56,
  },
  walletCurrency: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    paddingBottom: 7,
  },
  walletUpdated: {
    color: colors.ink,
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
    backgroundColor: "#F0FDF9",
    borderColor: "rgba(0,204,153,0.2)",
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: "#F3FCF9",
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
