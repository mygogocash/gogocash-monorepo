import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Copy as CopyIcon } from "@mobile/theme/icons";

import type { MobileSession } from "@mobile/auth/session";
import { GoGoPassAvatar } from "@mobile/components/GoGoPassAvatar";
import { GoGoPassBadge } from "@mobile/components/GoGoPassBadge";
import { webProfileHeroCard, webProfileWalletSummary } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { copyToClipboard } from "@mobile/lib/clipboard";
import { useToast } from "@mobile/hooks/useToast";
import { colors, radii, spacing, typography } from "@mobile/theme/tokens";

import profileAvatarImage from "../../assets/profile-avatar.png";

const AVATAR_SIZE = 96;

/**
 * Profile hero — parity with the Next.js web `CardProfile`
 * (src/features/profile/component/CardProfile.tsx): a mint banner with the
 * GoGoPass ring avatar (display-only — no upload, per the plan), the member name
 * + "GOGOPASS" badge, a "User ID" row with a copy button, and a mint "invite
 * link" chip with a copy button. Avatar/badge/name styling mirrors
 * `CustomerProfileBar`; the User-ID and invite-link values come from the shared
 * `webProfileHeroCard` mock (visual parity with mock data). Copy buttons use the
 * cross-platform `copyToClipboard` and surface a toast on success/failure.
 */
export function ProfileHeroCard({ session }: { session: MobileSession }) {
  const tc = useCopy();
  const toast = useToast();

  const username =
    typeof session.username === "string" && session.username
      ? session.username
      : webProfileWalletSummary.username;
  const tier =
    typeof session.membership_tier === "string" && session.membership_tier
      ? session.membership_tier
      : webProfileWalletSummary.membershipTier;
  const avatarUrl =
    typeof session.avatar_url === "string" && session.avatar_url.trim()
      ? session.avatar_url.trim()
      : null;

  const copyValue = async (value: string, successMessage: string) => {
    const copied = await copyToClipboard(value);
    toast.show(tc(copied ? successMessage : webProfileHeroCard.copyFailedToast));
  };

  return (
    <View style={[styles.banner, bannerGradient]}>
      <GoGoPassAvatar ringWidth={4} size={AVATAR_SIZE} tier={tier}>
        <Image
          accessibilityLabel={tc("Avatar")}
          resizeMode="cover"
          source={avatarUrl ? { uri: avatarUrl } : profileAvatarImage}
          style={styles.avatarImage}
        />
      </GoGoPassAvatar>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {username}
          </Text>
          <GoGoPassBadge tier={tier} />
        </View>

        <View style={styles.userIdRow}>
          <Text style={styles.userIdText}>
            {tc(webProfileHeroCard.userIdLabel)}:{" "}
            <Text style={styles.userIdValue}>{webProfileHeroCard.userId}</Text>
          </Text>
          <Pressable
            accessibilityLabel={tc(webProfileHeroCard.userIdCopyAria)}
            accessibilityRole="button"
            onPress={() =>
              void copyValue(webProfileHeroCard.userId, webProfileHeroCard.userIdCopiedToast)
            }
            style={styles.userIdCopyButton}
          >
            <CopyIcon color={colors.ink} size={18} strokeWidth={typography.iconStrokeWidth} />
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel={tc(webProfileHeroCard.inviteLinkCopyAria)}
          accessibilityRole="button"
          onPress={() =>
            void copyValue(webProfileHeroCard.inviteLink, webProfileHeroCard.inviteLinkCopiedToast)
          }
          style={styles.inviteRow}
        >
          <Text style={styles.inviteLabel}>{tc(webProfileHeroCard.inviteLinkLabel)} :</Text>
          <Text numberOfLines={1} style={styles.inviteValue}>
            {webProfileHeroCard.inviteLink}
          </Text>
          <CopyIcon color={colors.white} size={18} strokeWidth={typography.iconStrokeWidth} />
        </Pressable>
      </View>
    </View>
  );
}

// Web-only banner background (mirrors the web Profile Banner blue/mint blend);
// ignored on native, where the solid mint backgroundColor below stands in.
const bannerGradient = {
  backgroundImage:
    "radial-gradient(circle at 94% -8%, rgba(84, 203, 137, 0.38) 0%, rgba(84, 203, 137, 0) 56%), linear-gradient(90deg, #00CC99 0%, #19D3A2 60%, #5D87FF 160%)",
} as unknown as ViewStyle;

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  identity: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  name: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 30,
  },
  userIdRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  userIdText: {
    color: "#7F7F7F",
    fontFamily: typography.family,
    fontSize: 16,
    lineHeight: 22,
  },
  userIdValue: {
    color: colors.ink,
    fontFamily: typography.family,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  userIdCopyButton: {
    alignItems: "center",
    borderRadius: radii.sm,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  inviteRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 12,
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.22)",
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: "100%",
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inviteLabel: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  inviteValue: {
    color: colors.white,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
  },
});
