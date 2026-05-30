import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Mail as MailIcon,
  MessageCircle as LineIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout, webAccountSettingsPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

import angellistCommunityImage from "../../assets/account-settings-community/angellist.png";
import crunchbaseCommunityImage from "../../assets/account-settings-community/crunchbase.png";
import discordCommunityImage from "../../assets/account-settings-community/discord.png";
import facebookCommunityImage from "../../assets/account-settings-community/facebook.png";
import githubCommunityImage from "../../assets/account-settings-community/github.png";
import instagramCommunityImage from "../../assets/account-settings-community/instagram.png";
import lineCommunityImage from "../../assets/account-settings-community/line.png";
import linkedinCommunityImage from "../../assets/account-settings-community/linkedin.png";
import lumaCommunityImage from "../../assets/account-settings-community/luma.png";
import questnCommunityImage from "../../assets/account-settings-community/questn.png";
import telegramCommunityImage from "../../assets/account-settings-community/telegram.png";
import xCommunityImage from "../../assets/account-settings-community/x.png";
import youtubeCommunityImage from "../../assets/account-settings-community/youtube.png";

const communityAssets = {
  angellist: angellistCommunityImage,
  crunchbase: crunchbaseCommunityImage,
  discord: discordCommunityImage,
  facebook: facebookCommunityImage,
  github: githubCommunityImage,
  instagram: instagramCommunityImage,
  line: lineCommunityImage,
  linkedin: linkedinCommunityImage,
  luma: lumaCommunityImage,
  questn: questnCommunityImage,
  telegram: telegramCommunityImage,
  x: xCommunityImage,
  youtube: youtubeCommunityImage,
} as const;

type CommunityCardModel = (typeof webAccountSettingsPage.community.cards)[number];
type NotificationRowModel = (typeof webAccountSettingsPage.notifications.rows)[number];

export function CustomerAccountSettingsScreen() {
  return (
    <AccountSettingsSubPage>
      <AccountSettingsTopBar />
      <View style={styles.content}>
        <SubscriptionSection />
        <NotificationSection />
        <CommunitySection />
      </View>
    </AccountSettingsSubPage>
  );
}

function AccountSettingsSubPage({ children }: { children: ReactNode }) {
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={webAccountSettingsPage.title}>
      <View style={[styles.surface, styles.accountSettingsSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function AccountSettingsTopBar() {
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{webAccountSettingsPage.title}</Text>
      </Pressable>
    </Link>
  );
}

function SubscriptionSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{webAccountSettingsPage.subscription.title}</Text>
      <View style={styles.subscriptionCard}>
        <Text style={styles.subscriptionDescription}>
          {webAccountSettingsPage.subscription.description}
        </Text>
        <Pressable disabled style={styles.subscriptionButton}>
          <Text style={styles.subscriptionButtonText}>
            {webAccountSettingsPage.subscription.actionLabel}
          </Text>
        </Pressable>
        <Text style={styles.subscriptionDisabledNote}>
          {webAccountSettingsPage.subscription.disabledNote}
        </Text>
      </View>
    </View>
  );
}

function NotificationSection() {
  const [isLineEnabled] = useState(false);
  const [isEmailEnabled] = useState(true);
  const enabledById = {
    email: isEmailEnabled,
    line: isLineEnabled,
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{webAccountSettingsPage.notifications.title}</Text>
      <View style={styles.notificationStack}>
        {webAccountSettingsPage.notifications.rows.map((row) => (
          <NotificationRow enabled={enabledById[row.id]} key={row.id} row={row} />
        ))}
      </View>
    </View>
  );
}

function NotificationRow({
  enabled,
  row,
}: {
  enabled: boolean;
  row: NotificationRowModel;
}) {
  const Icon = row.id === "line" ? LineIcon : MailIcon;

  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationCopy}>
        <Icon color={colors.muted} size={24} strokeWidth={typography.iconStrokeWidth} />
        <Text numberOfLines={1} style={styles.notificationLabel}>
          {row.label}
        </Text>
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>
            {webAccountSettingsPage.notifications.comingSoonLabel}
          </Text>
        </View>
      </View>
      <TogglePill enabled={enabled} />
    </View>
  );
}

function TogglePill({ enabled }: { enabled: boolean }) {
  return (
    <View style={[styles.toggleTrack, enabled ? styles.toggleTrackOn : null]}>
      <View style={[styles.toggleThumb, enabled ? styles.toggleThumbOn : null]} />
    </View>
  );
}

function CommunitySection() {
  const { width } = useWindowDimensions();
  const columns = width >= mobileShellLayout.desktopBreakpoint ? 3 : 2;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{webAccountSettingsPage.community.title}</Text>
      <View style={styles.communityGrid}>
        {webAccountSettingsPage.community.cards.map((card) => (
          <CommunityCard card={card} columns={columns} key={card.id} />
        ))}
      </View>
    </View>
  );
}

function CommunityCard({
  card,
  columns,
}: {
  card: CommunityCardModel;
  columns: 2 | 3;
}) {
  return (
    <MotionPressable
      accessibilityLabel={`${webAccountSettingsPage.community.joinLabel} ${card.label}`}
      accessibilityRole="link"
      pressScale={0.99}
      style={[styles.communityCard, columns === 3 ? styles.communityCardDesktop : null]}
    >
      <Image
        alt={`${webAccountSettingsPage.community.joinLabel} ${card.label}`}
        resizeMode="cover"
        source={communityAssets[card.asset]}
        style={styles.communityImage}
      />
      <Text style={styles.communityAccessibleLabel}>
        {webAccountSettingsPage.community.joinLabel} {card.label}
      </Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  accountSettingsSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 8,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    gap: 40,
    maxWidth: 696,
    paddingBottom: 34,
    paddingHorizontal: 12,
    paddingTop: 16,
    width: "100%",
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  subscriptionCard: {
    borderColor: "rgba(152,152,152,0.4)",
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  subscriptionDescription: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  subscriptionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 44,
    opacity: 0.58,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    width: "100%",
  },
  subscriptionButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  subscriptionDisabledNote: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationStack: {
    gap: 8,
  },
  notificationRow: {
    alignItems: "center",
    borderColor: "rgba(152,152,152,0.4)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  notificationCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    minWidth: 0,
  },
  notificationLabel: {
    color: colors.muted,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 16,
    minWidth: 0,
  },
  comingSoonPill: {
    backgroundColor: "#F0F0F0",
    borderRadius: radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: "#6B7280",
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "500",
  },
  toggleTrack: {
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: radii.chip,
    height: 20,
    justifyContent: "center",
    opacity: 0.5,
    paddingHorizontal: 2,
    width: 36,
  },
  toggleTrackOn: {
    backgroundColor: colors.primary,
    opacity: 1,
  },
  toggleThumb: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radii.chip,
    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
    height: 16,
    width: 16,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  communityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  communityCard: {
    aspectRatio: 224 / 117,
    backgroundColor: colors.card,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    flexGrow: 1,
    flexShrink: 1,
    overflow: "hidden",
    width: "47%",
  },
  communityCardDesktop: {
    width: "31%",
  },
  communityImage: {
    height: "100%",
    width: "100%",
  },
  communityAccessibleLabel: {
    height: 1,
    left: 1,
    opacity: 0,
    overflow: "hidden",
    position: "absolute",
    top: 1,
    width: 1,
  },
});
