import { Link, useRouter } from "expo-router";
import {
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  LogOut as LogOutIcon,
  UserPlus as InviteIcon,
  UserRound as ProfileIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { AccountPageShell, AccountWalletHeroCard } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { ProfileInfoPanel } from "@mobile/components/ProfileInfoPanel";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { useMobileLogout } from "@mobile/auth/useMobileLogout";
import { mapUserProfileToWalletSummary } from "@mobile/api/profileMapper";
import { isUserProfileResponse } from "@mobile/api/profileTypes";
import { readMembershipTier } from "@mobile/lib/membershipTier";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { copyToClipboard } from "@mobile/lib/clipboard";
import {
  mobileShellLayout,
  profileInviteUrl,
  profileHubMenuItems,
  profileHubSubNavItems,
  webProfileWalletSummary,
} from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { pickThemed } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";
import { LogoutConfirmCard } from "@mobile/components/LogoutConfirmCard";
import { getProfileMenuIcon, type ProfileMenuIcon } from "@mobile/components/profileMenuIcons";
import { useSyncProfileSessionFields } from "@mobile/hooks/useSyncProfileSessionFields";

export function CustomerProfileScreen() {
  const styles = useThemedStyles(createProfileScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const session = useMobileSessionSnapshot();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const sessionWalletSummary = getSessionWalletSummary(session);
  const [profileSubNavOpen, setProfileSubNavOpen] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { logout: handleLogout, pending: logoutPending } = useMobileLogout();
  const profileResource = useCustomerAccountResource({
    fixtureData: webProfileWalletSummary,
    resourceId: "profile",
  });
  // Precedence: live backend doc > session overlay > fixture. In fixtures mode
  // resource.data is the fixture summary, which the live-doc guard rejects, so
  // the session overlay path is byte-identical to the pre-live behavior.
  const walletSummary = isUserProfileResponse(profileResource.data)
    ? mapUserProfileToWalletSummary(profileResource.data, sessionWalletSummary)
    : sessionWalletSummary;
  useSyncProfileSessionFields(profileResource.data);

  const avatarUrl =
    typeof session?.avatar_url === "string" && session.avatar_url.trim()
      ? session.avatar_url.trim()
      : isUserProfileResponse(profileResource.data) &&
          typeof profileResource.data.avatar_url === "string" &&
          profileResource.data.avatar_url.trim()
        ? profileResource.data.avatar_url.trim()
        : null;

  const profileShellWhileLoading =
    profileResource.status === "loading" && Boolean(session?.access_token);

  if (profileResource.status !== "ready" && !profileShellWhileLoading) {
    return (
      <CustomerAccountResourceState
        emptyBody={tc("Complete your profile setup to unlock account actions.")}
        emptyTitle={tc("No profile details yet")}
        resource={profileResource}
        resourceLabel="profile"
      />
    );
  }

  return (
    <AccountPageShell activeRouteId="profile" showProfileRail showTitle={false} title={tc("Profile")}>
      {isDesktop ? (
        <ProfileInfoPanel session={session ?? {}} />
      ) : (
      <View style={styles.profileHubStack}>
        <AccountWalletHeroCard
          amount={walletSummary.amount}
          avatarUrl={avatarUrl}
          currency={walletSummary.currency}
          lastUpdated={walletSummary.lastUpdated}
          maskedId={walletSummary.maskedId}
          tier={walletSummary.tier}
          title={walletSummary.username}
          userId={walletSummary.userId}
        />
        <View style={styles.profilePanelShell}>
          <ProfilePanelHeader
            onPress={() => setProfileSubNavOpen((open) => !open)}
            profileSubNavOpen={profileSubNavOpen}
          />
          {profileSubNavOpen ? (
            <View style={styles.profileSubNavGroup}>
              {profileHubSubNavItems.map((item) => (
                <Link asChild href={item.href as never} key={item.href}>
                  <MotionPressable pressScale={0.98} style={styles.profileSubNavRow}>
                    <Text style={styles.profileSubNavText}>{tc(item.label)}</Text>
                  </MotionPressable>
                </Link>
              ))}
            </View>
          ) : null}
          <View style={styles.profileNavGroup}>
            {profileHubMenuItems
              .filter((item) => item.label !== "Profile")
              .map((item) =>
                item.label === "Invite your Friends" ? (
                  <InviteFriendsRow href={item.href} key={item.label} />
                ) : (
                  <ProfileNavRow
                    external={"external" in item && item.external === true}
                    href={item.href}
                    icon={getProfileMenuIcon(item.label)}
                    key={item.label}
                    label={item.label}
                  />
                )
              )}
            <MotionPressable
              accessibilityLabel={tc("Log Out")}
              accessibilityRole="button"
              onPress={() => setLogoutConfirmOpen(true)}
              pressScale={0.98}
              style={styles.logoutRow}
            >
              <LogOutIcon
                color={colors.primaryDark}
                size={24}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text style={styles.profileRowText}>{tc("Log Out")}</Text>
            </MotionPressable>
            {logoutConfirmOpen ? (
              <LogoutConfirmCard
                onCancel={() => setLogoutConfirmOpen(false)}
                onConfirm={handleLogout}
                pending={logoutPending}
              />
            ) : null}
          </View>
        </View>
      </View>
      )}
    </AccountPageShell>
  );
}

function ProfilePanelHeader({
  onPress,
  profileSubNavOpen,
}: {
  onPress: () => void;
  profileSubNavOpen: boolean;
}) {
  const styles = useThemedStyles(createProfileScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <MotionPressable
      {...({ "aria-expanded": profileSubNavOpen } as { "aria-expanded": boolean })}
      accessibilityRole="button"
      accessibilityState={{ expanded: profileSubNavOpen }}
      onPress={onPress}
      pressScale={0.98}
      style={styles.profilePanelHeader}
    >
      <View style={styles.profilePanelHeaderIconRing}>
        <ProfileIcon color={colors.white} size={24} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <Text style={styles.profilePanelTitle}>{tc("Profile")}</Text>
      {profileSubNavOpen ? (
        <ChevronUpIcon color={colors.white} size={22} strokeWidth={typography.iconStrokeWidth} />
      ) : (
        <ChevronDownIcon color={colors.white} size={22} strokeWidth={typography.iconStrokeWidth} />
      )}
    </MotionPressable>
  );
}

function InviteFriendsRow({ href }: { href: string }) {
  const styles = useThemedStyles(createProfileScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const router = useRouter();
  const toast = useToast();
  const [rowHovered, setRowHovered] = useState(false);

  const handleCopyLink = () => {
    copyInviteLink();
    // Confirm the copy with a transient toast, reusing the existing translated
    // catalog string (key walletTransactionsCopied) so Thai resolves too.
    toast.show(tc("Copied to clipboard"));
  };

  return (
    <View style={[styles.inviteRow, rowHovered ? styles.inviteRowHovered : null]}>
      <MotionPressable
        accessibilityLabel={tc("Open referral page")}
        accessibilityRole="button"
        hoverLift={false}
        onHoverIn={() => setRowHovered(true)}
        onHoverOut={() => setRowHovered(false)}
        onPress={() => router.push(href as never)}
        pressScale={0.98}
        style={styles.inviteCardLinkArea}
      >
        <InviteIcon color={colors.primaryDark} size={24} strokeWidth={typography.iconStrokeWidth} />
        <View style={styles.inviteCopy}>
          <Text numberOfLines={1} style={styles.inviteTitle}>
            {tc("Invite your Friends")}
          </Text>
          <Text style={styles.inviteSubtitle}>{tc("Invited : 2")}</Text>
        </View>
      </MotionPressable>
      <MotionPressable
        accessibilityRole="button"
        // The pill is only 24px tall (styles.copyButton); hitSlop expands the
        // tap target to a comfortable ~44px without changing the visual layout.
        hitSlop={{ bottom: 10, left: 10, right: 10, top: 10 }}
        hoverLift={false}
        onHoverIn={() => setRowHovered(true)}
        onHoverOut={() => setRowHovered(false)}
        onPress={handleCopyLink}
        pressScale={0.98}
        style={styles.copyButton}
      >
        <Text style={styles.copyButtonText}>{tc("Copy Link")}</Text>
        <View style={styles.copyButtonIcon}>
          <CopyIcon color={colors.white} size={16} strokeWidth={typography.iconStrokeWidth} />
        </View>
      </MotionPressable>
    </View>
  );
}

function copyInviteLink() {
  void copyToClipboard(profileInviteUrl);
}

function ProfileNavRow({
  external = false,
  href,
  icon: Icon,
  label,
}: {
  external?: boolean;
  href: string;
  icon: ProfileMenuIcon;
  label: string;
}) {
  const styles = useThemedStyles(createProfileScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <Link
      asChild
      href={href as never}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      <MotionPressable pressScale={0.98} style={styles.profileRow}>
        <Icon color={colors.primaryDark} size={24} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.profileRowText}>{tc(label)}</Text>
        {external ? (
          <ExternalLinkIcon
            color={colors.primaryDark}
            size={16}
            strokeWidth={typography.iconStrokeWidth}
          />
        ) : null}
      </MotionPressable>
    </Link>
  );
}

function getSessionWalletSummary(session: ReturnType<typeof useMobileSessionSnapshot>) {
  const sessionId = typeof session?._id === "string" && session._id ? session._id : null;

  return {
    ...webProfileWalletSummary,
    amount: typeof session?.wallet === "string" && session.wallet ? session.wallet : webProfileWalletSummary.amount,
    maskedId: sessionId ? maskSessionId(sessionId) ?? webProfileWalletSummary.maskedId : webProfileWalletSummary.maskedId,
    userId: sessionId ?? webProfileWalletSummary.userId,
    username:
      typeof session?.username === "string" && session.username
        ? session.username
        : webProfileWalletSummary.username,
    tier: readMembershipTier(session?.membership_tier) ?? "",
  };
}

function maskSessionId(value: string | boolean | null | undefined): string | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const suffix = value.slice(-4).padStart(4, "*");

  return `***${suffix}`;
}

function createProfileScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  profileHubStack: {
    gap: spacing.md,
    width: "100%",
  },
  profilePanelShell: {
    backgroundColor: "transparent",
    borderWidth: 0,
    gap: 12,
    width: "100%",
  },
  profilePanelHeader: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: 16,
    maxHeight: 52,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  profilePanelHeaderIconRing: {
    alignItems: "center",
    borderWidth: 0,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  profilePanelTitle: {
    color: colors.white,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
  },
  profileSubNavGroup: {
    gap: 8,
    paddingLeft: 12,
  },
  profileSubNavRow: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  profileSubNavText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
  },
  profileNavGroup: {
    gap: 12,
  },
  profileRow: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 16,
    maxHeight: 52,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  profileRowText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
  },
  inviteRow: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#DCEBFF", colors.primarySoft),
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    maxHeight: 52,
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: 16,
    width: "100%",
  },
  inviteRowHovered: {
    backgroundColor: pickThemed(colors, "#C8DFFB", "#0A3329"),
  },
  inviteCardLinkArea: {
    alignItems: "center",
    backgroundColor: "transparent",
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 52,
    minWidth: 0,
  },
  inviteCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  inviteTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 20,
  },
  inviteSubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 16,
  },
  copyButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.sm,
    height: 24,
    justifyContent: "center",
    minWidth: 102,
    paddingHorizontal: 12,
  },
  copyButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: typography.labelWeight,
    lineHeight: typography.captionLineHeight,
  },
  copyButtonIcon: {
    alignItems: "center",
    height: 14,
    justifyContent: "center",
    width: 14,
  },
  logoutRow: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 16,
    maxHeight: 52,
    minHeight: 52,
    paddingHorizontal: 16,
  },
});
}
