import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Mail as MailIcon,
  MessageCircle as LineIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout, webAccountSettingsPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type CommunityCardModel = (typeof webAccountSettingsPage.community.cards)[number];
type NotificationRowModel = (typeof webAccountSettingsPage.notifications.rows)[number];

// Local-only brand styling for the "Join our Community" cards. The shared
// `webAccountSettingsPage.community.cards` constant only carries { id, label, asset };
// the web renders full banner images, but on mobile we approximate each brand with a
// solid brand-colored surface + a short text/letter glyph (no image assets required).
// Defined LOCALLY here per the screen brief — webDesignParity.ts is not edited.
type CommunityBrandStyle = {
  background: string;
  foreground: string;
  glyph: string;
};

const communityBrandStyles: Record<CommunityCardModel["id"], CommunityBrandStyle> = {
  facebook: { background: "#1877F2", foreground: "#FFFFFF", glyph: "f" },
  instagram: { background: "#E1306C", foreground: "#FFFFFF", glyph: "◎" },
  line: { background: "#06C755", foreground: "#FFFFFF", glyph: "LINE" },
  youtube: { background: "#FF0000", foreground: "#FFFFFF", glyph: "▶" },
  x: { background: "#0F1419", foreground: "#FFFFFF", glyph: "𝕏" },
  telegram: { background: "#229ED9", foreground: "#FFFFFF", glyph: "✈" },
  luma: { background: "#161616", foreground: "#FFFFFF", glyph: "lu" },
  linkedin: { background: "#0A66C2", foreground: "#FFFFFF", glyph: "in" },
  discord: { background: "#5865F2", foreground: "#FFFFFF", glyph: "✺" },
  questn: { background: "#6D28D9", foreground: "#FFFFFF", glyph: "Q" },
  github: { background: "#181717", foreground: "#FFFFFF", glyph: "⌥" },
  angellist: { background: "#000000", foreground: "#FFFFFF", glyph: "A∙" },
  crunchbase: { background: "#0288D1", foreground: "#FFFFFF", glyph: "cb" },
};

function getCommunityBrandStyle(id: CommunityCardModel["id"]): CommunityBrandStyle {
  return communityBrandStyles[id] ?? { background: colors.ink, foreground: colors.white, glyph: "•" };
}

export function CustomerAccountSettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <AccountSettingsSubPage>
      {/* Mobile-only back link — on desktop the persistent sidebar handles navigation
          (web parity: the SubPage topbar is md:hidden). */}
      {isDesktop ? null : <AccountSettingsTopBar />}
      <View style={styles.content}>
        <SubscriptionSection />
        <NotificationSection />
        <CommunitySection />
      </View>
    </AccountSettingsSubPage>
  );
}

function AccountSettingsSubPage({ children }: { children: ReactNode }) {
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webAccountSettingsPage.title)}>
      <View style={[styles.surface, styles.accountSettingsSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function AccountSettingsTopBar() {
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{tc(webAccountSettingsPage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function SubscriptionSection() {
  const tc = useCopy();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(webAccountSettingsPage.subscription.title)}</Text>
      <View style={styles.subscriptionCard}>
        <Text style={styles.subscriptionDescription}>
          {tc(webAccountSettingsPage.subscription.description)}
        </Text>
        <Pressable disabled style={styles.subscriptionButton}>
          <Text style={styles.subscriptionButtonText}>
            {tc(webAccountSettingsPage.subscription.actionLabel)}
          </Text>
        </Pressable>
        <Text style={styles.subscriptionDisabledNote}>
          {tc(webAccountSettingsPage.subscription.disabledNote)}
        </Text>
      </View>
    </View>
  );
}

function NotificationSection() {
  const tc = useCopy();
  // Defaults match the web (Figma): Line off, Email on. The toggles are display-only
  // ("Coming soon"), so the value is fixed — there is no setter wired.
  const [isLineEnabled] = useState(false);
  const [isEmailEnabled] = useState(true);
  const enabledById: Record<NotificationRowModel["id"], boolean> = {
    email: isEmailEnabled,
    line: isLineEnabled,
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(webAccountSettingsPage.notifications.title)}</Text>
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
  const tc = useCopy();
  const Icon = row.id === "line" ? LineIcon : MailIcon;

  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationCopy}>
        <Icon color={colors.muted} size={24} strokeWidth={typography.iconStrokeWidth} />
        <Text numberOfLines={1} style={styles.notificationLabel}>
          {tc(row.label)}
        </Text>
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>
            {tc(webAccountSettingsPage.notifications.comingSoonLabel)}
          </Text>
        </View>
      </View>
      <Switch
        accessibilityLabel={tc(row.label)}
        disabled
        ios_backgroundColor="#F0F0F0"
        thumbColor={colors.white}
        trackColor={{ false: "#F0F0F0", true: colors.primary }}
        value={enabled}
      />
    </View>
  );
}

function CommunitySection() {
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const columns = width >= mobileShellLayout.desktopBreakpoint ? 3 : 2;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(webAccountSettingsPage.community.title)}</Text>
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
  const tc = useCopy();
  const brand = getCommunityBrandStyle(card.id);
  const joinLabel = tc(webAccountSettingsPage.community.joinLabel);

  return (
    <MotionPressable
      accessibilityLabel={`${joinLabel} ${card.label}`}
      accessibilityRole="link"
      pressScale={0.99}
      style={[
        styles.communityCard,
        columns === 3 ? styles.communityCardDesktop : null,
        { backgroundColor: brand.background },
      ]}
    >
      <View style={styles.communityCardCopy}>
        <Text numberOfLines={1} style={[styles.communityJoinLabel, { color: brand.foreground }]}>
          {joinLabel}
        </Text>
        <Text numberOfLines={1} style={[styles.communityBrandName, { color: brand.foreground }]}>
          {card.label}
        </Text>
      </View>
      <Text numberOfLines={1} style={[styles.communityGlyph, { color: brand.foreground }]}>
        {brand.glyph}
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
  communityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  communityCard: {
    aspectRatio: 224 / 117,
    alignItems: "flex-start",
    borderRadius: radii.md,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "space-between",
    overflow: "hidden",
    padding: spacing.md,
    width: "47%",
  },
  communityCardDesktop: {
    width: "31%",
  },
  communityCardCopy: {
    gap: 2,
    width: "100%",
  },
  communityJoinLabel: {
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.85,
  },
  communityBrandName: {
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
  communityGlyph: {
    alignSelf: "flex-end",
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
});
