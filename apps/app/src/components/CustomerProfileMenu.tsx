import { Link } from "expo-router";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

// Re-exported so the shared wallet hero card stays reachable from this module and
// the profile-menu parity guard keeps locking the popover to the web-parity sources.
// The desktop popover itself renders the popper-variant `PopoverWalletHeroCard`
// below (web parity: WalletSummaryHeroCard variant="popper"), which the page-variant
// `AccountWalletHeroCard` cannot reproduce (different avatar size, radius, type scale).
export { AccountWalletHeroCard } from "@mobile/components/AccountPageShell";
import { GoGoPassAvatar } from "@mobile/components/GoGoPassAvatar";
import { ProfileAvatarImage } from "@mobile/components/ProfileAvatarImage";
import { GoGoPassBadge } from "@mobile/components/GoGoPassBadge";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getProfileMenuIcon, type ProfileMenuIcon } from "@mobile/components/profileMenuIcons";
import { useProfileWalletAmount } from "@mobile/account/useProfileWalletAmount";
import { clearMobileAppSession, type MobileSession } from "@mobile/auth/session";
import { webProfileWalletHeroSurface, webProfileWalletSummary } from "@mobile/design/webDesignParity";
import { profileHubMenuItems } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { ExternalLink as ExternalLinkIcon, LogOut as LogOutIcon } from "@mobile/theme/icons";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

function deriveSummary(session: MobileSession) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const region = str(session.region);
  return {
    title: str(session.username) ?? webProfileWalletSummary.username,
    tier: str(session.membership_tier) ?? webProfileWalletSummary.membershipTier,
    avatarUrl: str(session.avatar_url),
    maskedId: webProfileWalletSummary.maskedId,
    lastUpdated: webProfileWalletSummary.lastUpdated,
    currency: region && region !== "Thailand" ? "USD" : webProfileWalletSummary.currency,
  };
}

// Down-arrow-into-tray glyph — parity with the web `WithdrawIcon`
// (src/components/icons/WithdrawIcon.tsx) used on the popover's Withdraw pill.
function WithdrawGlyph({ color, size = 16 }: { color?: string; size?: number }) {
  const { colors } = useTheme();
  const strokeColor = color ?? colors.white;
  return (
    <Svg fill="none" height={size} viewBox="0 0 29 29" width={size}>
      <Path
        d="M17 1.26667C16.1378 1.09067 15.2489 1.00178 14.3333 1C6.96933 1 1 6.96933 1 14.3333C1 21.6973 6.96933 27.6667 14.3333 27.6667C21.6973 27.6667 27.6667 21.6973 27.6667 14.3333C27.6649 13.4178 27.576 12.5289 27.4 11.6667"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M14.3346 10.3332C12.8613 10.3332 11.668 11.2292 11.668 12.3332C11.668 13.4372 12.8613 14.3332 14.3346 14.3332C15.808 14.3332 17.0013 15.2292 17.0013 16.3332C17.0013 17.4372 15.808 18.3332 14.3346 18.3332M14.3346 10.3332C15.4946 10.3332 16.484 10.8892 16.8493 11.6666M14.3346 10.3332V8.99991M14.3346 18.3332C13.1746 18.3332 12.1853 17.7772 11.82 16.9999M14.3346 18.3332V19.6666M20.9986 7.66924L26.5666 2.09857M27.6653 6.97324L27.508 2.85324C27.508 1.88124 26.928 1.27591 25.8706 1.19991L21.7053 1.00391"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

// Web-only radial+linear glass wash (the popper variant paints `back_wallet.svg`
// behind a frosted panel). On native the solid `glassFallbackColor` stands in.
const glassGradientStyle = {
  backgroundImage: webProfileWalletHeroSurface.glassBackgroundImage,
} as unknown as ViewStyle;

/**
 * Wallet hero card — pixel parity with the web `WalletSummaryHeroCard`
 * variant="popper" (src/components/common/WalletSummaryHeroCard.tsx) shown at the
 * top of the desktop profile popover: a ~352px-wide, rounded-13, ~260px-tall card
 * with a #00AA80 header band (GoGoPass 52px ring avatar + GOGOPASS badge + white
 * name + #83F2D6 masked id) over a frosted glass panel ("Total Cashback Available"
 * label, 40px amount + 18px currency, 12px "Last Updated", and a #00CC99 Withdraw
 * pill). Routes to /withdraw and closes the popover on press, like the web Link.
 */
function PopoverWalletHeroCard({
  amount,
  avatarUrl,
  currency,
  lastUpdated,
  maskedId,
  onWithdraw,
  tier,
  title,
}: {
  amount: string;
  avatarUrl: string | null;
  currency: string;
  lastUpdated: string;
  maskedId: string;
  onWithdraw: () => void;
  tier?: string;
  title: string;
}) {
  const styles = useThemedStyles(createProfileMenuStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.heroCard}>
      {/* Header band: #00AA80, avatar left, GOGOPASS badge + name + masked id right. */}
      <View style={styles.heroHeader}>
        <GoGoPassAvatar ringWidth={3} size={52} tier={tier}>
          <View style={styles.heroAvatarFrame}>
            <ProfileAvatarImage
              accessibilityLabel={tc("Profile avatar")}
              avatarUrl={avatarUrl}
              size={52}
              style={styles.heroAvatarImage}
            />
          </View>
        </GoGoPassAvatar>
        <View style={styles.heroUser}>
          <View style={styles.heroNameRow}>
            <GoGoPassBadge tier={tier} />
            <Text numberOfLines={1} style={styles.heroName}>
              {title}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.heroMaskedId}>
            {maskedId}
          </Text>
        </View>
      </View>

      {/* Frosted glass panel: cashback label + amount + last-updated + Withdraw. */}
      <View style={[styles.heroGlass, glassGradientStyle]}>
        <Text style={styles.heroKicker}>{tc("Total Cashback Available")}</Text>
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmount}>{amount}</Text>
          <Text style={styles.heroCurrency}>{currency}</Text>
        </View>
        <Text style={styles.heroUpdated}>{lastUpdated}</Text>
        <Link asChild href="/withdraw" onPress={onWithdraw}>
          <MotionPressable
            accessibilityLabel={tc("Withdraw")}
            accessibilityRole="link"
            pressScale={0.98}
            style={styles.heroWithdraw}
          >
            <Text style={styles.heroWithdrawText}>{tc("Withdraw")}</Text>
            <WithdrawGlyph color={colors.white} size={16} />
          </MotionPressable>
        </Link>
      </View>
    </View>
  );
}

// Match the web's <a target="_blank" rel="noopener noreferrer"> for external rows:
// open in a new tab on web, or the system browser on native. (expo-router's <Link
// asChild> drops target/rel onto a custom child, so external links can't rely on it.)
function openExternalUrl(url: string) {
  if (typeof window !== "undefined" && typeof window.open === "function") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void Linking.openURL(url);
}

function MenuRow({
  external,
  href,
  icon: Icon,
  label,
  onClose,
}: {
  external?: boolean;
  href: string;
  icon: ProfileMenuIcon;
  label: string;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createProfileMenuStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const row = (
    <MotionPressable
      accessibilityLabel={tc(label)}
      accessibilityRole="link"
      onPress={
        external
          ? () => {
              onClose();
              openExternalUrl(href);
            }
          : undefined
      }
      pressScale={0.98}
      style={styles.row}
    >
      <Icon color={colors.primaryDark} size={24} strokeWidth={typography.iconStrokeWidth} />
      <Text numberOfLines={1} style={styles.rowLabel}>
        {tc(label)}
      </Text>
      {external ? (
        <ExternalLinkIcon
          color={colors.primaryDark}
          size={16}
          strokeWidth={typography.iconStrokeWidth}
        />
      ) : null}
    </MotionPressable>
  );

  // Internal routes navigate in-app via expo-router <Link>; external links open out.
  if (external) {
    return row;
  }
  return (
    <Link asChild href={href as never} onPress={onClose}>
      {row}
    </Link>
  );
}

/**
 * Desktop account dropdown content — parity with the web `ProfileHeaderPopperContent`:
 * the wallet hero card + the profile menu rows + log out. Rendered inside the
 * popover panel by `CustomerProfileNav`; `onNavigate` closes the popover.
 */
export function CustomerProfileMenu({
  session,
  onNavigate,
}: {
  session: MobileSession;
  onNavigate: () => void;
}) {
  const styles = useThemedStyles(createProfileMenuStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { amount: walletAmount } = useProfileWalletAmount();
  const summary = deriveSummary(session);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
      style={styles.scroller}
    >
      <PopoverWalletHeroCard
        amount={walletAmount}
        avatarUrl={summary.avatarUrl}
        currency={summary.currency}
        lastUpdated={summary.lastUpdated}
        maskedId={summary.maskedId}
        onWithdraw={onNavigate}
        tier={summary.tier}
        title={summary.title}
      />

      <View style={styles.menuGroup}>
        {profileHubMenuItems.map((item) => (
          <MenuRow
            external={"external" in item && item.external === true}
            href={item.href}
            icon={getProfileMenuIcon(item.label)}
            key={item.label}
            label={item.label}
            onClose={onNavigate}
          />
        ))}
      </View>

      <View style={styles.divider} />

      <Link
        asChild
        href={"/" as never}
        onPress={() => {
          void clearMobileAppSession();
          onNavigate();
        }}
      >
        <MotionPressable
          accessibilityLabel={tc("Log Out")}
          accessibilityRole="button"
          pressScale={0.98}
          style={styles.row}
        >
          <LogOutIcon
            color={colors.primaryDark}
            size={24}
            strokeWidth={typography.iconStrokeWidth}
          />
          <Text style={styles.rowLabel}>{tc("Log Out")}</Text>
        </MotionPressable>
      </Link>
    </ScrollView>
  );
}

function createProfileMenuStyles(colors: ThemeColors) {
  // Web frosted glass keeps its mint/blue wash in every theme; body copy stays
  // #3B3B3B and must not follow colors.ink (light in dark mode).
  const heroGlassInk = "#3B3B3B";

  return StyleSheet.create({
  scroller: {
    maxHeight: 560,
  },
  content: {
    // Web ProfileHeaderPopperContent: items-center gap-[14px].
    alignItems: "center",
    gap: 14,
    paddingBottom: 4,
  },
  // --- Popover wallet hero card (web WalletSummaryHeroCard variant="popper") ---
  heroCard: {
    // h-[260px] w-full max-w-[352px] rounded-[13px] shadow-[3px_-2px_4px_rgba(0,0,0,0.05)]
    backgroundColor: webProfileWalletHeroSurface.outerColor,
    borderRadius: 13,
    boxShadow: "3px -2px 4px rgba(0, 0, 0, 0.05)",
    height: 260,
    maxWidth: 352,
    overflow: "hidden",
    width: "100%",
  },
  heroHeader: {
    // bg-[#00AA80] px-[18px] pt-4 pb-3, items-start justify-between gap-3
    alignItems: "flex-start",
    backgroundColor: webProfileWalletHeroSurface.headerColor,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  heroAvatarFrame: {
    backgroundColor: "#FFDBE3",
    borderRadius: 26,
    height: "100%",
    overflow: "hidden",
    width: "100%",
  },
  heroAvatarImage: {
    height: "100%",
    width: "100%",
  },
  heroUser: {
    alignItems: "flex-end",
    flexShrink: 1,
    gap: 4,
    minWidth: 0,
  },
  heroNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  heroName: {
    // text-base font-medium leading-normal text-white, textShadow 2px 2px 4px rgba(0,0,0,0.3)
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    // react-native-web deprecates the per-prop textShadow* in favor of the CSS
    // `textShadow` shorthand, while RN core's TextStyle only models textShadow*.
    // Branch per platform: web gets the shorthand (warning-free), native keeps the
    // valid props. Cast the web-only key since RN's TextStyle type omits it.
    ...Platform.select<TextStyle>({
      web: { textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)" } as unknown as TextStyle,
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { height: 2, width: 2 },
        textShadowRadius: 4,
      },
    }),
  },
  heroMaskedId: {
    // text-xs font-normal leading-normal text-[#83F2D6]
    color: "#83F2D6",
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  heroGlass: {
    // rounded-t-[16px] rounded-b-[13px] border border-white/40 bg-white/20 -mt-2 px-5 pt-4 pb-5
    alignItems: "center",
    backgroundColor: webProfileWalletHeroSurface.glassFallbackColor,
    borderColor: webProfileWalletHeroSurface.glassBorderColor,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 16,
    justifyContent: "center",
    marginTop: -8,
    overflow: "hidden",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroKicker: {
    // text-xs font-normal leading-normal, text-[#3B3B3B]
    color: heroGlassInk,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
    textAlign: "center",
  },
  heroAmountRow: {
    // items-baseline justify-center gap-1
    alignItems: "baseline",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  heroAmount: {
    // text-[40px] font-semibold leading-none. The web's tracking-tight is
    // intentionally NOT reproduced: negative letterSpacing clips DM Sans in RN
    // (project typography-parity guard), and the page-variant card omits it too.
    color: heroGlassInk,
    fontFamily: typography.family,
    fontSize: 40,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 40,
  },
  heroCurrency: {
    // text-lg font-semibold leading-none
    color: heroGlassInk,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 18,
  },
  heroUpdated: {
    // text-xs font-normal text-[#3B3B3B]
    color: heroGlassInk,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
  },
  heroWithdraw: {
    // h-11 min-h-[44px] w-full rounded-full bg-[#00CC99] px-6, gap-2, centered
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  heroWithdrawText: {
    // text-base font-medium text-white
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
  },
  // --- Menu list ---
  menuGroup: {
    flexDirection: "column",
    width: "100%",
  },
  row: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 16,
    height: 52,
    paddingHorizontal: 16,
    width: "100%",
  },
  rowLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "400",
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 4,
    width: "100%",
  },
});
}

