import { Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Copy as CopyIcon } from "@mobile/theme/icons";

import type { MobileSession } from "@mobile/auth/session";
import { GoGoPassAvatar } from "@mobile/components/GoGoPassAvatar";
import { GoGoPassBadge } from "@mobile/components/GoGoPassBadge";
import { ProfileAvatarImage } from "@mobile/components/ProfileAvatarImage";
import { mobileShellLayout, webProfileHeroCard, webProfileWalletSummary } from "@mobile/design/webDesignParity";
import { useProfileAvatarUpload } from "@mobile/hooks/useProfileAvatarUpload";
import { useCopy } from "@mobile/i18n/useCopy";
import { copyToClipboard } from "@mobile/lib/clipboard";
import { readMembershipTier } from "@mobile/lib/membershipTier";
import { useToast } from "@mobile/hooks/useToast";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

const DESKTOP_AVATAR_SIZE = 96;
const COMPACT_AVATAR_SIZE = 72;
const COMPACT_LAYOUT_MAX_WIDTH = 560;

/**
 * Profile hero — parity with the Next.js web `CardProfile`
 * (src/features/profile/component/CardProfile.tsx): a mint banner with the
 * GoGoPass ring avatar, the member name + "GOGOPASS" badge, a "User ID" row with a
 * copy button, and a mint "invite link" chip with a copy button. Desktop/web
 * members can tap the avatar to upload a high-resolution profile photo.
 */
export function ProfileHeroCard({ session }: { session: MobileSession }) {
  const tc = useCopy();
  const toast = useToast();
  const styles = useThemedStyles(createProfileHeroCardStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_LAYOUT_MAX_WIDTH;
  const avatarSize = isCompact ? COMPACT_AVATAR_SIZE : DESKTOP_AVATAR_SIZE;

  const username =
    typeof session.username === "string" && session.username
      ? session.username
      : webProfileWalletSummary.username;
  const tier = readMembershipTier(session.membership_tier);
  const avatarUrl =
    typeof session.avatar_url === "string" && session.avatar_url.trim()
      ? session.avatar_url.trim()
      : null;
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const { avatarUrl: uploadedAvatarUrl, pickAndUpload, uploading } =
    useProfileAvatarUpload(avatarUrl);
  const displayAvatarUrl = uploadedAvatarUrl ?? avatarUrl;

  const copyValue = async (value: string, successMessage: string) => {
    const copied = await copyToClipboard(value);
    toast.show(tc(copied ? successMessage : webProfileHeroCard.copyFailedToast));
  };

  const iconColor = pickThemed(colors, colors.primaryDark, colors.white);

  return (
    <View style={[styles.banner, isCompact ? styles.bannerCompact : null, colors.isDark ? null : bannerGradient]}>
      <View style={[styles.headerBand, isCompact ? styles.headerBandCompact : null]}>
        <Pressable
          accessibilityHint={isDesktop ? tc("Upload a profile photo") : undefined}
          accessibilityLabel={tc("Avatar")}
          accessibilityRole={isDesktop ? "button" : "image"}
          disabled={!isDesktop || uploading}
          onPress={isDesktop ? () => void pickAndUpload() : undefined}
          style={styles.avatarPressable}
        >
          <GoGoPassAvatar ringWidth={isCompact ? 3 : 4} size={avatarSize} tier={tier}>
            <ProfileAvatarImage
              accessibilityLabel={tc("Avatar")}
              avatarUrl={displayAvatarUrl}
              size={avatarSize}
              style={styles.avatarImage}
            />
          </GoGoPassAvatar>
          {isDesktop ? (
            <View style={[styles.avatarUploadBadge, { pointerEvents: "none" }]}>
              <Text style={styles.avatarUploadBadgeText}>
                {uploading ? tc("Uploading…") : tc("Change photo")}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.identityHeader}>
          <Text numberOfLines={2} style={[styles.name, isCompact ? styles.nameCompact : null]}>
            {username}
          </Text>
          <GoGoPassBadge tier={tier} />
        </View>
      </View>

      <View style={styles.metaStack}>
        <View style={styles.userIdChip}>
          <Text style={styles.userIdLabel}>{tc(webProfileHeroCard.userIdLabel)}</Text>
          <View style={styles.userIdValueRow}>
            <Text numberOfLines={1} style={styles.userIdValue}>
              {webProfileHeroCard.userId}
            </Text>
            <Pressable
              accessibilityLabel={tc(webProfileHeroCard.userIdCopyAria)}
              accessibilityRole="button"
              onPress={() =>
                void copyValue(webProfileHeroCard.userId, webProfileHeroCard.userIdCopiedToast)
              }
              style={styles.iconButton}
            >
              <CopyIcon color={iconColor} size={16} strokeWidth={typography.iconStrokeWidth} />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityLabel={tc(webProfileHeroCard.inviteLinkCopyAria)}
          accessibilityRole="button"
          onPress={() =>
            void copyValue(webProfileHeroCard.inviteLink, webProfileHeroCard.inviteLinkCopiedToast)
          }
          style={styles.inviteRow}
        >
          <Text numberOfLines={1} style={styles.inviteLabel}>
            {tc(webProfileHeroCard.inviteLinkLabel)}
          </Text>
          <View style={styles.inviteLinkRow}>
            <Text ellipsizeMode="middle" numberOfLines={1} style={styles.inviteValue}>
              {webProfileHeroCard.inviteLink}
            </Text>
            <View style={styles.inviteCopyIcon}>
              <CopyIcon color={iconColor} size={16} strokeWidth={typography.iconStrokeWidth} />
            </View>
          </View>
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

function createProfileHeroCardStyles(colors: ThemeColors) {
  const frostedChip = {
    backgroundColor: pickThemed(colors, "rgba(255, 255, 255, 0.94)", "rgba(255, 255, 255, 0.08)"),
    borderColor: pickThemed(colors, "rgba(255, 255, 255, 0.65)", colors.borderStrong),
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: pickThemed(colors, "0 2px 10px rgba(16, 53, 34, 0.08)", "none"),
  } as const;

  return StyleSheet.create({
    banner: {
      backgroundColor: pickThemed(colors, colors.primary, colors.primarySoft),
      borderColor: colors.isDark ? colors.borderStrong : "transparent",
      borderRadius: radii.lg,
      borderWidth: colors.isDark ? 1 : 0,
      gap: spacing.md,
      overflow: "hidden",
      padding: spacing.lg,
      width: "100%",
    },
    bannerCompact: {
      padding: spacing.md,
    },
    headerBand: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.lg,
      width: "100%",
    },
    headerBandCompact: {
      gap: spacing.md,
    },
    avatarPressable: {
      alignItems: "center",
      position: "relative",
    },
    avatarImage: {
      height: "100%",
      width: "100%",
    },
    avatarUploadBadge: {
      backgroundColor: "rgba(16, 53, 34, 0.72)",
      borderRadius: 999,
      bottom: -4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      position: "absolute",
    },
    avatarUploadBadgeText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 11,
      fontWeight: "600",
    },
    identityHeader: {
      flex: 1,
      gap: spacing.sm,
      justifyContent: "center",
      minWidth: 0,
    },
    name: {
      color: pickThemed(colors, colors.ink, colors.white),
      fontFamily: typography.family,
      fontSize: 24,
      fontWeight: "600",
      lineHeight: 30,
    },
    nameCompact: {
      fontSize: 20,
      lineHeight: 26,
    },
    metaStack: {
      gap: spacing.sm,
      width: "100%",
    },
    userIdChip: {
      ...frostedChip,
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      width: "100%",
    },
    userIdLabel: {
      color: pickThemed(colors, colors.primaryDark, "rgba(255, 255, 255, 0.72)"),
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    userIdValueRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
      minWidth: 0,
      width: "100%",
    },
    userIdValue: {
      color: pickThemed(colors, colors.ink, colors.white),
      flex: 1,
      fontFamily: typography.family,
      fontSize: 15,
      fontVariant: ["tabular-nums"],
      fontWeight: "600",
      minWidth: 0,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, colors.primarySoft, "rgba(255, 255, 255, 0.12)"),
      borderRadius: radii.sm,
      flexShrink: 0,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    inviteRow: {
      ...frostedChip,
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      width: "100%",
    },
    inviteLabel: {
      color: pickThemed(colors, colors.primaryDark, "rgba(255, 255, 255, 0.72)"),
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    inviteLinkRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      minWidth: 0,
      width: "100%",
    },
    inviteValue: {
      color: pickThemed(colors, colors.ink, colors.white),
      flex: 1,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "500",
      minWidth: 0,
    },
    inviteCopyIcon: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, colors.primarySoft, "rgba(255, 255, 255, 0.12)"),
      borderRadius: radii.sm,
      flexShrink: 0,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
  });
}
