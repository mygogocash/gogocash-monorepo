import { Link, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck as BadgeCheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  CircleHelp as HelpIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  FileQuestion as MissingOrdersIcon,
  FileText as FileTextIcon,
  Globe2 as GlobeIcon,
  Heart as HeartIcon,
  LogOut as LogOutIcon,
  ShieldCheck as ShieldCheckIcon,
  Star as GoGoPassIcon,
  Trophy as QuestIcon,
  UserPlus as InviteIcon,
  UserRound as ProfileIcon,
  WalletCards as WalletIcon,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { AccountPageShell, AccountWalletHeroCard } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { clearMobileAppSession } from "@mobile/auth/session";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import {
  profileInviteUrl,
  profileHubMenuItems,
  profileHubSubNavItems,
  webProfileWalletSummary,
} from "@mobile/design/webDesignParity";
import { resetObservabilityIdentity } from "@mobile/observability/client";
import { colors, radii, spacing, typography } from "@mobile/theme/tokens";

type ProfileMenuIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

const profileMenuIcons: Record<string, ProfileMenuIcon> = {
  "Age Verification": BadgeCheckIcon,
  "Connect with GoGoCash": GlobeIcon,
  "Consent Preferences": ShieldCheckIcon,
  "Favorite Brands": HeartIcon,
  "GoGoQuest History": QuestIcon,
  "Help Center": HelpIcon,
  GoGoPass: GoGoPassIcon,
  "Invite your Friends": InviteIcon,
  "Missing Orders": MissingOrdersIcon,
  "My Wallet": WalletIcon,
  Profile: ProfileIcon,
  "Privacy Policy": ShieldCheckIcon,
  "Terms of Service": FileTextIcon,
  "Terms of Use": FileTextIcon,
};

export function CustomerProfileScreen() {
  const session = useMobileSessionSnapshot();
  const sessionWalletSummary = getSessionWalletSummary(session);
  const [profileSubNavOpen, setProfileSubNavOpen] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const profileResource = useCustomerAccountResource({
    fixtureData: webProfileWalletSummary,
    resourceId: "profile",
  });

  const handleLogout = async () => {
    setLogoutPending(true);
    await clearMobileAppSession();
    queryClient.clear();
    resetObservabilityIdentity();
    router.replace("/login" as never);
  };

  if (profileResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody="Complete your profile setup to unlock account actions."
        emptyTitle="No profile details yet"
        resource={profileResource}
        resourceLabel="profile"
      />
    );
  }

  return (
    <AccountPageShell activeRouteId="profile" showProfileRail showTitle={false} title="Profile">
      <View style={styles.profileHubStack}>
        <AccountWalletHeroCard
          amount={sessionWalletSummary.amount}
          currency={sessionWalletSummary.currency}
          lastUpdated={sessionWalletSummary.lastUpdated}
          maskedId={sessionWalletSummary.maskedId}
          title={sessionWalletSummary.username}
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
                    <Text style={styles.profileSubNavText}>{item.label}</Text>
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
              accessibilityLabel="Log Out"
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
              <Text style={styles.profileRowText}>Log Out</Text>
            </MotionPressable>
            {logoutConfirmOpen ? (
              <View style={styles.logoutConfirmCard}>
                <Text style={styles.logoutConfirmTitle}>Log out of GoGoCash?</Text>
                <Text style={styles.logoutConfirmBody}>
                  This clears your saved session on this device before returning to sign in.
                </Text>
                <View style={styles.logoutConfirmActions}>
                  <MotionPressable
                    accessibilityRole="button"
                    disabled={logoutPending}
                    onPress={() => setLogoutConfirmOpen(false)}
                    pressScale={0.98}
                    style={styles.logoutCancelButton}
                  >
                    <Text style={styles.logoutCancelText}>Cancel</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    disabled={logoutPending}
                    onPress={handleLogout}
                    pressScale={0.98}
                    style={styles.logoutConfirmButton}
                  >
                    <Text style={styles.logoutConfirmText}>
                      {logoutPending ? "Logging out" : "Log out"}
                    </Text>
                  </MotionPressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>
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
      <Text style={styles.profilePanelTitle}>Profile</Text>
      {profileSubNavOpen ? (
        <ChevronUpIcon color={colors.white} size={22} strokeWidth={typography.iconStrokeWidth} />
      ) : (
        <ChevronDownIcon color={colors.white} size={22} strokeWidth={typography.iconStrokeWidth} />
      )}
    </MotionPressable>
  );
}

function InviteFriendsRow({ href }: { href: string }) {
  const router = useRouter();

  return (
    <View style={styles.inviteRow}>
      <MotionPressable
        accessibilityLabel="Open referral page"
        accessibilityRole="button"
        onPress={() => router.push(href as never)}
        pressScale={0.98}
        style={styles.inviteCardLinkArea}
      >
        <InviteIcon color={colors.primaryDark} size={24} strokeWidth={typography.iconStrokeWidth} />
        <View style={styles.inviteCopy}>
          <Text numberOfLines={1} style={styles.inviteTitle}>
            Invite your Friends
          </Text>
          <Text style={styles.inviteSubtitle}>Invited : 2</Text>
        </View>
      </MotionPressable>
      <MotionPressable
        accessibilityRole="button"
        onPress={copyInviteLink}
        pressScale={0.98}
        style={styles.copyButton}
      >
        <Text style={styles.copyButtonText}>Copy Link</Text>
        <View style={styles.copyButtonIcon}>
          <CopyIcon color={colors.white} size={16} strokeWidth={typography.iconStrokeWidth} />
        </View>
      </MotionPressable>
    </View>
  );
}

function copyInviteLink() {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(profileInviteUrl);
  }
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
  return (
    <Link
      asChild
      href={href as never}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      <MotionPressable pressScale={0.98} style={styles.profileRow}>
        <Icon color={colors.primaryDark} size={24} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.profileRowText}>{label}</Text>
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

function getProfileMenuIcon(label: string): ProfileMenuIcon {
  return profileMenuIcons[label] ?? FileTextIcon;
}

function getSessionWalletSummary(session: ReturnType<typeof useMobileSessionSnapshot>) {
  return {
    ...webProfileWalletSummary,
    amount: typeof session?.wallet === "string" && session.wallet ? session.wallet : webProfileWalletSummary.amount,
    maskedId: maskSessionId(session?._id) ?? webProfileWalletSummary.maskedId,
    username:
      typeof session?.username === "string" && session.username
        ? session.username
        : webProfileWalletSummary.username,
  };
}

function maskSessionId(value: string | boolean | null | undefined): string | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const suffix = value.slice(-4).padStart(4, "*");

  return `***${suffix}`;
}

const styles = StyleSheet.create({
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
    backgroundColor: "#DCEBFF",
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    maxHeight: 52,
    minHeight: 52,
    paddingHorizontal: 16,
    width: "100%",
  },
  inviteCardLinkArea: {
    alignItems: "center",
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
  logoutConfirmCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  logoutConfirmTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  logoutConfirmBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  logoutConfirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  logoutCancelButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.chip,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  logoutCancelText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  logoutConfirmButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  logoutConfirmText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "800",
  },
});
