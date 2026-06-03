import { type ComponentType } from "react";
import { Link } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";

import { AccountWalletHeroCard } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { clearMobileAppSession, type MobileSession } from "@mobile/auth/session";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";
import { profileHubMenuItems } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  BadgeCheck as BadgeCheckIcon,
  ExternalLink as ExternalLinkIcon,
  FileQuestion as MissingOrdersIcon,
  FileText as FileTextIcon,
  Globe2 as GlobeIcon,
  Heart as HeartIcon,
  CircleHelp as HelpIcon,
  LogOut as LogOutIcon,
  ShieldCheck as ShieldCheckIcon,
  Star as GoGoPassIcon,
  Trophy as QuestIcon,
  UserPlus as InviteIcon,
  UserRound as ProfileIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";
import { colors, typography } from "@mobile/theme/tokens";

type MenuIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

// Mirror of CustomerProfileScreen's label -> icon map so the popover and the
// /profile page stay visually in sync (kept local to avoid touching the screen).
const PROFILE_MENU_ICONS: Record<string, MenuIcon> = {
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

function deriveSummary(session: MobileSession) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const region = str(session.region);
  return {
    title: str(session.username) ?? webProfileWalletSummary.username,
    amount: str(session.wallet) ?? webProfileWalletSummary.amount,
    tier: str(session.membership_tier) ?? webProfileWalletSummary.membershipTier,
    maskedId: webProfileWalletSummary.maskedId,
    lastUpdated: webProfileWalletSummary.lastUpdated,
    currency: region && region !== "Thailand" ? "USD" : webProfileWalletSummary.currency,
  };
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
  icon: MenuIcon;
  label: string;
  onClose: () => void;
}) {
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
  const tc = useCopy();
  const summary = deriveSummary(session);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
      style={styles.scroller}
    >
      <AccountWalletHeroCard
        amount={summary.amount}
        currency={summary.currency}
        lastUpdated={summary.lastUpdated}
        maskedId={summary.maskedId}
        tier={summary.tier}
        title={summary.title}
      />

      <View style={styles.menuGroup}>
        {profileHubMenuItems.map((item) => (
          <MenuRow
            external={"external" in item && item.external === true}
            href={item.href}
            icon={PROFILE_MENU_ICONS[item.label] ?? FileTextIcon}
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

const styles = StyleSheet.create({
  scroller: {
    maxHeight: 560,
  },
  content: {
    gap: 14,
    paddingBottom: 4,
  },
  menuGroup: {
    flexDirection: "column",
  },
  row: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 16,
    height: 52,
    paddingHorizontal: 16,
  },
  rowLabel: {
    color: "#3B3B3B",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "400",
  },
  divider: {
    backgroundColor: "#E4E4E4",
    height: 1,
    marginVertical: 4,
  },
});
