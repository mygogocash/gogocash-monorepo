import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Download as DownloadIcon,
  Mail as MailIcon,
  Trash as TrashIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { isGoGoPassEnabled } from "@mobile/config/featureFlags";
import { AppearanceSection } from "@mobile/components/AppearanceSection";
import { LanguageRegionSection } from "@mobile/components/LanguageRegionSection";
import { LineAppIcon } from "@mobile/components/LineAppIcon";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { getMobileEnv } from "@mobile/config/env";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { toastErrorMessages, userErrorMessageFromUnknown } from "@mobile/i18n/toastMessages";
import { useToast } from "@mobile/hooks/useToast";
import { useMobileLogout } from "@mobile/auth/useMobileLogout";
import { createPdpaApi } from "@mobile/pdpa/api";
import { mobileShellLayout, webAccountSettingsPage } from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

// Web-parity "Join our Community" banner images. The "Join Us on" text + brand logo are baked
// into each PNG, matching the web SubPage which renders /images/account-settings/community/<id>.png.
import angellistBanner from "../../assets/account-settings-community/angellist.png";
import crunchbaseBanner from "../../assets/account-settings-community/crunchbase.png";
import discordBanner from "../../assets/account-settings-community/discord.png";
import facebookBanner from "../../assets/account-settings-community/facebook.png";
import githubBanner from "../../assets/account-settings-community/github.png";
import instagramBanner from "../../assets/account-settings-community/instagram.png";
import lineBanner from "../../assets/account-settings-community/line.png";
import linkedinBanner from "../../assets/account-settings-community/linkedin.png";
import lumaBanner from "../../assets/account-settings-community/luma.png";
import questnBanner from "../../assets/account-settings-community/questn.png";
import telegramBanner from "../../assets/account-settings-community/telegram.png";
import xBanner from "../../assets/account-settings-community/x.png";
import youtubeBanner from "../../assets/account-settings-community/youtube.png";

type CommunityCardModel = (typeof webAccountSettingsPage.community.cards)[number];
type NotificationRowModel = (typeof webAccountSettingsPage.notifications.rows)[number];

// Each community brand maps to its baked web-parity banner image (imported above).
const communityBanners: Record<CommunityCardModel["id"], ImageSourcePropType> = {
  facebook: facebookBanner,
  instagram: instagramBanner,
  line: lineBanner,
  youtube: youtubeBanner,
  x: xBanner,
  telegram: telegramBanner,
  luma: lumaBanner,
  linkedin: linkedinBanner,
  discord: discordBanner,
  questn: questnBanner,
  github: githubBanner,
  angellist: angellistBanner,
  crunchbase: crunchbaseBanner,
};

export function CustomerAccountSettingsScreen() {
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <AccountSettingsSubPage>
      {/* Mobile-only back link — on desktop the persistent sidebar handles navigation
          (web parity: the SubPage topbar is md:hidden). */}
      {isDesktop ? null : <AccountSettingsTopBar />}
      <View style={styles.content}>
        <LanguageRegionSection />
        <AppearanceSection />
        {/* GoGoPass rollout flag: the Stripe subscription card is a GoGoPass
            surface — hidden builds drop it, neighbouring sections stay. */}
        {isGoGoPassEnabled() ? <SubscriptionSection /> : null}
        <NotificationSection />
        <CommunitySection />
        <PdpaDataRightsSection />
      </View>
    </AccountSettingsSubPage>
  );
}

function AccountSettingsSubPage({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webAccountSettingsPage.title)}>
      <View style={[styles.surface, styles.accountSettingsSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function AccountSettingsTopBar() {
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
  const { colors } = useTheme();
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
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
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
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
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
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();

  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationCopy}>
        {row.id === "line" ? (
          // Web parity: the LINE brand mark (ported from the Next.js LineAppIcon), not a generic bubble.
          <LineAppIcon color={colors.muted} size={24} />
        ) : (
          <MailIcon color={colors.muted} size={24} strokeWidth={typography.iconStrokeWidth} />
        )}
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
        ios_backgroundColor={colors.border}
        style={styles.switchDisabled}
        thumbColor={colors.white}
        trackColor={{ false: colors.border, true: colors.primary }}
        value={enabled}
      />
    </View>
  );
}

function CommunitySection() {
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
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
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
  const tc = useCopy();
  const joinLabel = tc(webAccountSettingsPage.community.joinLabel);

  // Web parity: the banner PNG already contains the "Join Us on <brand>" text + logo, so the card
  // is image-only (a11y name comes from the link label + the image alt, matching the web <a><img>).
  return (
    <MotionPressable
      accessibilityLabel={`${joinLabel} ${card.label}`}
      accessibilityRole="link"
      pressScale={0.99}
      style={[styles.communityCard, columns === 3 ? styles.communityCardDesktop : null]}
    >
      <Image
        alt={`${joinLabel} ${card.label}`}
        resizeMode="cover"
        source={communityBanners[card.id]}
        style={styles.communityCardImage}
      />
    </MotionPressable>
  );
}

// Web parity accent for PDPA delete actions (web: text-[#c45c00]).
const PDPA_DANGER = "#C45C00";

function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return "****";
  }
  return `${trimmed.slice(0, 1)}***${trimmed.slice(atIndex)}`;
}

// PDPA data portability + erasure (web parity: PdpaDataRightsSection).
// Export posts to Nest POST /pdpa/data-export. Deletion is REAL (Google Play
// policy, 2026-07-11): a two-tap confirm POSTs /user/account-deletion — the
// backend schedules a 30-day anonymizing purge (cancellable by support within
// the window) — then the session signs out.
function PdpaDataRightsSection() {
  const styles = useThemedStyles(createAccountSettingsScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { locale } = useLocale();
  const toast = useToast();
  const { logout } = useMobileLogout();
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const exportPendingRef = useRef(false);

  const submitExportRequest = async () => {
    if (exportPendingRef.current) {
      return;
    }
    exportPendingRef.current = true;
    setExportPending(true);
    try {
      const env = getMobileEnv();
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        toast.show(tc(toastErrorMessages.submitRequestFailed));
        return;
      }
      await createPdpaApi(client).requestDataExport({ locale });
      const sessionStore = await getSharedSessionStore();
      const session = await sessionStore?.getSession();
      const email =
        typeof session?.email === "string" ? session.email.trim() : "";
      const masked = email ? maskEmailForDisplay(email) : null;
      toast.show(
        masked
          ? `${tc("Request submitted")} — we'll email ${masked}`
          : tc("Request submitted")
      );
    } catch (error) {
      toast.show(tc(userErrorMessageFromUnknown(error, toastErrorMessages.submitRequestFailed)));
    } finally {
      exportPendingRef.current = false;
      setExportPending(false);
    }
  };

  const requestAccountDeletion = async () => {
    if (!confirmingDeletion) {
      setConfirmingDeletion(true);
      return;
    }
    if (deletionPending) {
      return;
    }
    setDeletionPending(true);
    try {
      const client = await getSharedMobileApiClient(getMobileEnv().apiUrl);
      if (!client) {
        throw new Error("No session client");
      }
      await client.post("/user/account-deletion");
      toast.show(tc("Deletion scheduled. Your account will be permanently removed in 30 days."));
      await logout();
    } catch {
      toast.show(tc("Could not complete your request. Please try again."));
    } finally {
      setDeletionPending(false);
      setConfirmingDeletion(false);
    }
  };

  return (
    <View style={styles.pdpaSection}>
      <Text style={styles.sectionTitle}>
        {`${tc("Download my data")} & ${tc("Account & deletion")}`}
      </Text>
      <View style={styles.pdpaCards}>
        <View style={styles.pdpaCard}>
          <View style={styles.pdpaCardHeader}>
            <DownloadIcon color={colors.primaryDark} size={24} strokeWidth={typography.iconStrokeWidth} />
            <Text style={styles.pdpaCardTitle}>{tc("Download my data")}</Text>
          </View>
          <Text style={styles.pdpaCardBody}>
            {tc(
              "We’ll send your data export to the email address you provided. This may take a little time depending on how much data we store.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: exportPending }}
            disabled={exportPending}
            onPress={() => {
              void submitExportRequest();
            }}
            style={styles.pdpaPrimaryButton}
          >
            <Text style={styles.pdpaPrimaryButtonText}>{tc("Request data export")}</Text>
          </Pressable>
          <Text style={styles.pdpaFootnote}>
            {tc("We’ll send your export data to the email address that you provided")}
          </Text>
        </View>

        <View style={[styles.pdpaCard, styles.pdpaCardDanger]}>
          <View style={styles.pdpaCardHeader}>
            <TrashIcon color={PDPA_DANGER} size={24} strokeWidth={typography.iconStrokeWidth} />
            <Text style={styles.pdpaCardTitle}>{tc("Account & deletion")}</Text>
          </View>
          <Text style={styles.pdpaCardBody}>
            {tc(
              "Deletion is permanent for data we are allowed to erase. Some records must be kept or anonymized where the law requires (for example tax or fraud rules).",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={deletionPending}
            onPress={() => void requestAccountDeletion()}
            style={styles.pdpaDangerButton}
          >
            <Text style={styles.pdpaDangerButtonText}>
              {tc(confirmingDeletion ? "Tap again to permanently delete" : "Request account deletion")}
            </Text>
          </Pressable>
          <Text style={styles.pdpaFootnote}>
            {tc("Some records may be anonymized instead of deleted where the law requires retention.")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function createAccountSettingsScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    borderColor: colors.border,
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
  // Coming-soon switches are functionally disabled; dim them so they READ as
  // disabled instead of inviting taps (user report 2026-07-10).
  switchDisabled: {
    opacity: 0.5,
  },
  notificationRow: {
    alignItems: "center",
    borderColor: colors.border,
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
    backgroundColor: colors.border,
    borderRadius: radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: colors.muted,
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
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderRadius: radii.md,
    borderWidth: 1,
    // No flexGrow: web parity uses fixed grid columns, so a lone last card (e.g. the 13th,
    // Crunch Base) stays one column wide instead of stretching to fill the whole row.
    flexShrink: 1,
    overflow: "hidden",
    width: "47%",
  },
  communityCardDesktop: {
    width: "31%",
  },
  communityCardImage: {
    height: "100%",
    width: "100%",
  },
  pdpaSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  pdpaCards: {
    gap: spacing.md,
  },
  pdpaCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  pdpaCardDanger: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.border,
  },
  pdpaCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  pdpaCardTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  pdpaCardBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  pdpaPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    width: "100%",
  },
  pdpaPrimaryButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  pdpaDangerButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: PDPA_DANGER,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    width: "100%",
  },
  pdpaDangerButtonText: {
    color: PDPA_DANGER,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  pdpaFootnote: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
}

