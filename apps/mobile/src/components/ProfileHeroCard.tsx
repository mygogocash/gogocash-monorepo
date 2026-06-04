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

// Web-only banner background — the EXACT web `CardProfile` banner
// (public/profile/profile-banner-bg.svg): a #00CC99 base with a white radial sheen,
// a faint #0064D6 top-left wash, and three white swoosh circles on the right. Inlined
// as a data-URI (encoded at module load) and stretched to fill via backgroundSize.
// Ignored on native, where the solid #00CC99 backgroundColor on `banner` stands in.
const PROFILE_BANNER_SVG =
  `<svg width="696" height="173" viewBox="0 0 696 173" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><g clip-path="url(#clip0_profile_banner)"><rect width="696" height="173" rx="24" fill="#00CC99"/><rect width="696" height="173" rx="24" fill="url(#paint0_radial_profile_banner)"/><rect width="696" height="173" rx="24" fill="url(#paint1_linear_profile_banner)"/><g clip-path="url(#clip1_profile_banner)"><path d="M603 339.5C705.725 339.5 789 256.225 789 153.5C789 50.775 705.725 -32.5 603 -32.5C500.275 -32.5 417 50.775 417 153.5C417 256.225 500.275 339.5 603 339.5Z" fill="white" fill-opacity="0.1"/><path d="M655 364.5C757.725 364.5 841 281.225 841 178.5C841 75.775 757.725 -7.5 655 -7.5C552.275 -7.5 469 75.775 469 178.5C469 281.225 552.275 364.5 655 364.5Z" fill="white" fill-opacity="0.2"/><path d="M706 406.5C808.725 406.5 892 323.225 892 220.5C892 117.775 808.725 34.5 706 34.5C603.275 34.5 520 117.775 520 220.5C520 323.225 603.275 406.5 706 406.5Z" fill="white" fill-opacity="0.4"/></g></g><defs><radialGradient id="paint0_radial_profile_banner" cx="0" cy="0" r="1" gradientTransform="matrix(-742.97 164.793 -740.267 -168.189 686.538 27.6257)" gradientUnits="userSpaceOnUse"><stop stop-color="#00CC99"/><stop offset="0.470937" stop-color="white"/></radialGradient><linearGradient id="paint1_linear_profile_banner" x1="-26.284" y1="0" x2="51.8972" y2="225.912" gradientUnits="userSpaceOnUse"><stop stop-color="#0064D6"/><stop offset="1" stop-color="#00CC99" stop-opacity="0"/></linearGradient><clipPath id="clip0_profile_banner"><rect width="696" height="173" rx="24" fill="white"/></clipPath><clipPath id="clip1_profile_banner"><rect width="279" height="218" fill="white" transform="translate(417 -13.5)"/></clipPath></defs></svg>`;
const bannerGradient = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(PROFILE_BANNER_SVG)}")`,
  backgroundSize: "100% 100%",
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
