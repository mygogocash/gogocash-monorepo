import { Image } from "expo-image";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MobileSession } from "@mobile/auth/session";
import { GoGoPassAvatar } from "@mobile/components/GoGoPassAvatar";
import { GoGoPassMark } from "@mobile/components/GoGoPassMark";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import profileAvatarImage from "../../assets/profile-avatar.png";

const AVATAR_SIZE = 34;

function isPremiumTier(tier?: string): boolean {
  return tier === "gogopass" || tier === "gogopass-pro";
}

// Flat 16x9 chevron — parity with the web `ArrowIcon`. Points down; rotates 180°
// (to point up) while the account popover is open, mirroring `rotate-180`.
function ProfileChevron({ open }: { open?: boolean }) {
  const styles = useThemedStyles(createProfileBarStyles);
  const { colors } = useTheme();
  return (
    <View style={open ? styles.chevronOpen : undefined}>
      <Svg fill="none" height={9} viewBox="0 0 16 9" width={16}>
        <Path
          clipRule="evenodd"
          d="M15.0039 0.146381C15.1991 -0.0486164 15.5157 -0.0487854 15.7109 0.146381C15.9059 0.341567 15.9058 0.658176 15.7109 0.853412L8.69234 7.87001C8.59432 7.97444 8.47611 8.05821 8.34468 8.11513C8.21334 8.17195 8.07178 8.20201 7.92867 8.20205C7.78539 8.20205 7.64316 8.17205 7.51168 8.11513C7.38504 8.06026 7.27062 7.98089 7.17476 7.88173L0.146442 0.853412C-0.0488114 0.65815 -0.0488169 0.341641 0.146442 0.146381C0.341712 -0.0487556 0.658252 -0.0488319 0.853474 0.146381L7.89351 7.18642C7.89794 7.19107 7.90326 7.19458 7.90914 7.19716C7.91522 7.19979 7.92205 7.20205 7.92867 7.20205C7.93522 7.202 7.94218 7.19977 7.9482 7.19716C7.95399 7.19456 7.95947 7.19103 7.96383 7.18642L7.97457 7.1747L15.0039 0.146381Z"
          fill={colors.primary}
          fillRule="evenodd"
        />
      </Svg>
    </View>
  );
}

/**
 * Signed-in header pill — parity with the Next.js web `ProfileBar`
 * (src/features/profile/component/ProfileBar.tsx): GoGoPass ring avatar + name
 * (+ a small gold verification mark for members — NOT the full "GOGOPASS" pill,
 * which competes with the name at this size) + wallet balance in mint + a flat
 * chevron, in a soft gradient panel. Falls back to the web mock summary so fields
 * missing from the session still render the design. `open` rotates the chevron
 * while the account popover is open; the wrapping press lives in the header.
 */
export function CustomerProfileBar({ open, session }: { open?: boolean; session: MobileSession }) {
  const styles = useThemedStyles(createProfileBarStyles);
  const { colors } = useTheme();
  const username =
    typeof session.username === "string" && session.username
      ? session.username
      : webProfileWalletSummary.username;
  const amount =
    typeof session.wallet === "string" && session.wallet
      ? session.wallet
      : webProfileWalletSummary.amount;
  const tier =
    typeof session.membership_tier === "string" && session.membership_tier
      ? session.membership_tier
      : webProfileWalletSummary.membershipTier;
  const avatarUrl =
    typeof session.avatar_url === "string" && session.avatar_url.trim()
      ? session.avatar_url.trim()
      : null;
  const currency =
    typeof session.region === "string" && session.region && session.region !== "Thailand"
      ? "USD"
      : webProfileWalletSummary.currency;
  const premium = isPremiumTier(tier);

  return (
    <View style={[styles.panel, colors.isDark ? null : softPanelGradient]}>
      <GoGoPassAvatar ringWidth={2} size={AVATAR_SIZE} tier={tier}>
        <Image
          accessibilityLabel="Avatar"
          cachePolicy="memory-disk"
          contentFit="cover"
          source={avatarUrl ? { uri: avatarUrl } : profileAvatarImage}
          style={styles.avatarImage}
        />
      </GoGoPassAvatar>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={[styles.name, premium ? styles.namePremium : styles.nameFree]}
          >
            {username}
          </Text>
          <GoGoPassMark marginLeft={5} size={13} tier={tier} />
        </View>
        <Text numberOfLines={1} style={styles.balance}>
          {amount} {currency}
        </Text>
      </View>

      <ProfileChevron open={open} />
    </View>
  );
}

// Web-only gradient (matches gc-soft-panel); ignored on native, where the solid
// panel backgroundColor below stands in.
const softPanelGradient = {
  backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 244, 0.92))",
} as unknown as ViewStyle;

function createProfileBarStyles(colors: ThemeColors) {
  return StyleSheet.create({
  panel: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: pickThemed(colors, "rgba(195, 209, 196, 0.75)", colors.border),
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    flexDirection: "row",
    gap: 10,
    height: 48,
    paddingHorizontal: 8,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  identity: {
    minWidth: 0,
    paddingRight: 2,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  name: {
    fontFamily: typography.family,
    fontSize: 13,
    lineHeight: 16,
  },
  namePremium: {
    color: colors.ink,
    fontWeight: "600",
  },
  nameFree: {
    color: "#87948B",
    fontWeight: "400",
  },
  balance: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 2,
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
});
}

