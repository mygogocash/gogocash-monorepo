import { Link, usePathname } from "expo-router";
import {
  CheckCircle2 as CheckIcon,
  ChevronLeft as ChevronLeftIcon,
  Settings as SettingsIcon,
  ShieldCheck as ShieldIcon,
  Store as StoreIcon,
} from "@mobile/theme/icons";
import { type ComponentType } from "react";
import { Platform, StyleSheet, Switch, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useToast } from "@mobile/hooks/useToast";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { toastErrorMessages } from "@mobile/i18n/toastMessages";
import {
  mobileShellLayout,
  profileHubGoGoTrackSubNavItems,
} from "@mobile/design/webDesignParity";
import { isGoGoTrackSubNavItemActive } from "@mobile/navigation/profileSectionNav";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import {
  createUnsupportedGoGoTrackDetector,
  type GoGoTrackDetector,
} from "@mobile/gototrack/detector";
import { GoGoTrackDetectionBanner } from "@mobile/gototrack/GoGoTrackDetectionBanner";
import {
  GoGoTrackPermissionDisclosure,
  GoGoTrackPermissionGrantSection,
} from "@mobile/gototrack/GoGoTrackPermissionGrantSection";
import {
  type GoGoTrackMerchant,
  useGoGoTrackMerchants,
} from "@mobile/gototrack/useGoGoTrackMerchants";
import { useGoGoTrackSettings } from "@mobile/gototrack/useGoGoTrackSettings";
import { useGoGoTrackBackgroundPrompts } from "@mobile/gototrack/useGoGoTrackBackgroundPrompts";

export type GoGoTrackFlowMode =
  | "hub"
  | "merchant"
  | "onboarding"
  | "permissions"
  | "settings";

type GoGoTrackIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

type GoGoTrackScreenProps = {
  merchantId?: string;
  mode: GoGoTrackFlowMode;
  // The live platform detector. Defaults to the unsupported no-op so render
  // tests + non-Android platforms stay safe; the Android routes inject the
  // native UsageStats detector (which can't be imported under the test harness).
  detector?: GoGoTrackDetector;
};

const gogoSenseFlowCopy = {
  hub: {
    eyebrow: "Protected tracking",
    title: "GoGoTrack",
    body: "Cashback tracking assistant that watches supported shopping sessions and keeps activation evidence in one secure flow.",
  },
  onboarding: {
    eyebrow: "Native setup",
    title: "Set up GoGoTrack",
    body: "Complete these steps before GoGoTrack starts detecting supported stores, checkout sessions, and missing cashback evidence.",
  },
  permissions: {
    eyebrow: "Consent first",
    title: "Permission checklist",
    body: "GoGoTrack never enables sensitive signals silently. Review why each permission is needed before opening device settings.",
  },
  settings: {
    eyebrow: "Privacy controls",
    title: "Tracking controls",
    body: "Tune GoGoTrack detection sources and data minimization before the native detector is enabled.",
  },
  merchant: {
    eyebrow: "Merchant detail",
    title: "Merchant tracking detail",
    body: "Check supported detection methods and activation status for this merchant.",
  },
} as const;

const setupRows = [
  "Install native detector",
  "Connect browser and app signals",
  "Review permission rationale",
  "Run first supported merchant check",
] as const;

const settingRows = [
  {
    title: "Show cashback prompt while shopping",
    body:
      Platform.OS === "ios"
        ? "Shows a Dynamic Island / Live Activity prompt when cashback is available (requires iOS 17+)."
        : "Shows a status notification with Accept while a supported store is open.",
    field: "backgroundPromptsEnabled",
  },
  {
    title: "Usage access detection",
    body: "Use foreground app transitions for supported Android merchant sessions.",
    field: "usageStatsEnabled",
  },
  {
    title: "PII minimization",
    body: "Redact receipt and screenshot data before upload.",
    field: "screenshotRecoveryEnabled",
  },
] as const;

export function CustomerGoGoTrackScreen({
  merchantId,
  mode,
  detector = createUnsupportedGoGoTrackDetector(),
}: GoGoTrackScreenProps) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const copy = gogoSenseFlowCopy[mode];
  const merchantRouteId = mode === "merchant" ? merchantId : undefined;
  const { loading: merchantLoading, merchant } = useGoGoTrackMerchants(
    merchantRouteId,
    undefined,
    mode === "merchant",
  );
  const merchantLabel = merchant?.name ?? merchantRouteId;

  return (
    <AccountPageShell activeRouteId="profile" showProfileRail showTitle={false} title={tc(copy.title)}>
      <View style={styles.page}>
        {isDesktop ? null : (
          <Link asChild href="/profile">
            <MotionPressable
              accessibilityRole="link"
              hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
              pressScale={0.98}
              style={styles.backLink}
            >
              <ChevronLeftIcon
                color={colors.accent}
                size={26}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text style={styles.backLinkText}>{tc("GoGoTrack")}</Text>
            </MotionPressable>
          </Link>
        )}

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <ShieldIcon
              color={colors.white}
              size={28}
              strokeWidth={typography.iconStrokeWidth}
            />
          </View>
          <Text numberOfLines={1} style={styles.eyebrow}>
            {tc(copy.eyebrow)}
          </Text>
          <Text numberOfLines={1} style={styles.title}>
            {tc(copy.title)}
          </Text>
          <Text style={styles.body}>{tc(copy.body)}</Text>
          {merchantId ? (
            <View style={styles.merchantIdPill}>
              <Text style={styles.merchantIdLabel}>
                {merchant ? "merchant" : "merchantId"}
              </Text>
              <Text style={styles.merchantIdValue}>{merchantLabel}</Text>
            </View>
          ) : null}
        </View>

        {mode !== "merchant" ? <GoGoTrackSectionNav /> : null}

        {mode === "hub" ? <HubContent detector={detector} /> : null}
        {mode === "onboarding" ? <OnboardingContent /> : null}
        {mode === "permissions" ? <PermissionsContent detector={detector} /> : null}
        {mode === "settings" ? <SettingsContent detector={detector} /> : null}
        {mode === "merchant" ? (
          <MerchantContent
            loading={merchantLoading}
            merchant={merchant}
            merchantId={merchantId}
          />
        ) : null}
      </View>
    </AccountPageShell>
  );
}

function HubContent({ detector }: { detector: GoGoTrackDetector }) {
  useGoGoTrackBackgroundPrompts(detector);
  return (
    <View style={{ gap: spacing.lg, width: "100%" }}>
      <GoGoTrackDetectionBanner detector={detector} />
      <GoGoTrackPermissionGrantSection detector={detector} />
    </View>
  );
}

function OnboardingContent() {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const tc = useCopy();
  const backgroundPromptCopy =
    Platform.OS === "ios"
      ? "Optional: enable Live Activity prompts in Settings after setup. GoGoCash only shows them when you opt in."
      : "Optional: enable background cashback notifications in Settings. GoGoCash shows a low-priority status notification while tracking.";
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={CheckIcon}
          subtitle="Every step is explicit so GoGoTrack never looks like a hidden tracker."
          title="Set up GoGoTrack"
        />
        {setupRows.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <Text style={styles.stepText}>{tc(step)}</Text>
          </View>
        ))}
        <Text style={styles.rowBody}>{tc(backgroundPromptCopy)}</Text>
      </View>
      <PrimaryLink
        href="/gototrack/permissions"
        label="Continue to permissions"
      />
    </>
  );
}

function PermissionsContent({ detector }: { detector: GoGoTrackDetector }) {
  useGoGoTrackBackgroundPrompts(detector);
  return (
    <>
      <GoGoTrackPermissionDisclosure />
      <GoGoTrackPermissionGrantSection detector={detector} />
      <PrimaryLink href="/gototrack/settings" label="Open settings" />
    </>
  );
}

function SettingsContent({ detector }: { detector: GoGoTrackDetector }) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const toast = useToast();
  const { settings, setField } = useGoGoTrackSettings(undefined, {
    onPersistError: () => toast.show(tc(toastErrorMessages.saveGoGoTrackSettingsFailed)),
  });
  useGoGoTrackBackgroundPrompts(detector);

  async function handleSettingChange(
    field: (typeof settingRows)[number]["field"],
    value: boolean,
  ) {
    if (value && field === "backgroundPromptsEnabled") {
      if (Platform.OS === "android") {
        const granted = await detector.hasUsageAccessPermission();
        if (!granted) {
          await detector.openUsageAccessSettings();
          return;
        }
      }
    }

    if (value && field === "usageStatsEnabled") {
      const granted = await detector.hasUsageAccessPermission();
      if (!granted) {
        await detector.openUsageAccessSettings();
        return;
      }
    }

    void setField(field, value);
  }

  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={SettingsIcon}
          subtitle="Default settings favor the smallest useful data set."
          title="Tracking controls"
        />
        {settingRows.map((row) => (
          <View key={row.title} style={styles.settingRow}>
            <Switch
              onValueChange={(value) =>
                void handleSettingChange(row.field, value)
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              value={settings[row.field]}
            />
            <View style={styles.settingCopy}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {tc(row.title)}
              </Text>
              <Text style={styles.rowBody}>{tc(row.body)}</Text>
            </View>
          </View>
        ))}
      </View>
      <SecondaryLink
        href="/gototrack/permissions"
        label="Permission checklist"
      />
    </>
  );
}

type MerchantContentProps = {
  loading: boolean;
  merchant: GoGoTrackMerchant | null;
  merchantId?: string;
};

function MerchantContent({
  loading,
  merchant,
  merchantId,
}: MerchantContentProps) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const merchantName = merchant?.name ?? merchantId ?? "Selected merchant";
  const catalogStatus = loading
    ? "Checking live merchant catalog."
    : merchant
      ? merchant.enabled
        ? "Live catalog marks this merchant as supported."
        : "Live catalog found this merchant, but tracking is disabled."
      : "Merchant is not in the live GoGoTrack catalog yet.";
  const packageSummary = merchant?.androidPackages.length
    ? `Android packages: ${merchant.androidPackages.join(", ")}.`
    : "Android package detection details are not available for this route yet.";
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={StoreIcon}
          subtitle="Merchant support is explicit so unsupported flows do not look tracked."
          title={merchantName}
        />
        <InfoRow
          body={catalogStatus}
          icon={ShieldIcon}
          title="Catalog status"
        />
        <InfoRow
          body={packageSummary}
          icon={StoreIcon}
          title="Android package detection"
        />
        <InfoRow
          body="Cashback evidence stays on-device until activation is confirmed."
          icon={ShieldIcon}
          title="Cashback evidence"
        />
      </View>
      <View style={styles.actionGrid}>
        <PrimaryLink href="/gototrack" label="GoGoTrack overview" />
        <SecondaryLink href="/gototrack/settings" label="Tracking settings" />
      </View>
    </>
  );
}

function SectionHeader({
  icon: Icon,
  subtitle,
  title,
}: {
  icon: GoGoTrackIcon;
  subtitle: string;
  title: string;
}) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Icon
          color={colors.primaryDark}
          size={20}
          strokeWidth={typography.iconStrokeWidth}
        />
      </View>
      <View style={styles.sectionCopy}>
        <Text numberOfLines={1} style={styles.sectionTitle}>
          {tc(title)}
        </Text>
        <Text style={styles.sectionSubtitle}>{tc(subtitle)}</Text>
      </View>
    </View>
  );
}

function InfoRow({
  body,
  icon: Icon,
  title,
}: {
  body: string;
  icon: GoGoTrackIcon;
  title: string;
}) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon
          color={colors.primaryDark}
          size={18}
          strokeWidth={typography.iconStrokeWidth}
        />
      </View>
      <View style={styles.infoCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {tc(title)}
        </Text>
        <Text style={styles.rowBody}>{tc(body)}</Text>
      </View>
    </View>
  );
}

function GoGoTrackSectionNav() {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const tc = useCopy();
  const pathname = usePathname();

  return (
    <View accessibilityRole="tablist" style={styles.sectionNav}>
      {profileHubGoGoTrackSubNavItems.map((item) => {
        const active = isGoGoTrackSubNavItemActive(pathname, item.href);
        return (
          <Link asChild href={item.href as never} key={item.href}>
            <MotionPressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                void haptics.impact();
              }}
              pressScale={motion.scale.subtlePress}
              style={StyleSheet.flatten([
                active ? styles.sectionNavItemActive : styles.sectionNavItem,
              ])}
            >
              <Text
                numberOfLines={1}
                style={StyleSheet.flatten([
                  active ? styles.sectionNavLabelActive : styles.sectionNavLabel,
                ])}
              >
                {tc(item.label)}
              </Text>
            </MotionPressable>
          </Link>
        );
      })}
    </View>
  );
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const tc = useCopy();
  return (
    <Link asChild href={href as never}>
      <MotionPressable
        onPress={() => {
          // Fire-and-forget selection cue; navigation still flows through Link.
          void haptics.impact();
        }}
        pressScale={motion.scale.subtlePress}
        style={styles.primaryButton}
      >
        <Text numberOfLines={1} style={styles.primaryButtonText}>
          {tc(label)}
        </Text>
      </MotionPressable>
    </Link>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  const styles = useThemedStyles(createGoGoTrackScreenStyles);
  const tc = useCopy();
  return (
    <Link asChild href={href as never}>
      <MotionPressable
        onPress={() => {
          // Fire-and-forget selection cue; navigation still flows through Link.
          void haptics.impact();
        }}
        pressScale={motion.scale.subtlePress}
        style={styles.secondaryButton}
      >
        <Text numberOfLines={1} style={styles.secondaryButtonText}>
          {tc(label)}
        </Text>
      </MotionPressable>
    </Link>
  );
}

function createGoGoTrackScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: {
      gap: spacing.md,
      width: "100%",
    },
    backLink: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
      minHeight: 44,
    },
    backLinkText: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: "700",
    },
    hero: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg,
      boxShadow: shadows.cardCss,
    },
    heroIcon: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 18,
      height: 52,
      justifyContent: "center",
      width: 52,
    },
    eyebrow: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    title: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: typography.title,
      fontWeight: "700",
      lineHeight: 34,
    },
    body: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.body,
      lineHeight: 22,
    },
    merchantIdPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
      borderRadius: radii.chip,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    merchantIdLabel: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    merchantIdValue: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
      boxShadow: shadows.cardCss,
    },
    sectionHeader: {
      flexDirection: "row",
      gap: spacing.md,
    },
    sectionIcon: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 14,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    sectionCopy: {
      flex: 1,
      gap: 4,
    },
    sectionTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 24,
    },
    sectionSubtitle: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.caption,
      lineHeight: 18,
    },
    permissionGrid: {
      gap: spacing.sm,
    },
    infoRow: {
      alignItems: "flex-start",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.md,
    },
    infoIcon: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 12,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    infoCopy: {
      flex: 1,
      gap: 4,
    },
    rowTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: typography.body,
      fontWeight: "800",
    },
    rowBody: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.caption,
      lineHeight: 18,
    },
    stepRow: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: radii.md,
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.md,
    },
    stepIndex: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "800",
      textAlign: "center",
      backgroundColor: colors.primary,
      borderRadius: 12,
      overflow: "hidden",
      width: 24,
    },
    stepText: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: typography.body,
      fontWeight: "700",
    },
    settingRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.md,
    },
    settingSwitch: {
      alignItems: "flex-end",
      backgroundColor: colors.primary,
      borderRadius: 16,
      height: 28,
      justifyContent: "center",
      paddingHorizontal: 3,
      width: 48,
    },
    settingSwitchKnob: {
      backgroundColor: colors.card,
      borderRadius: 11,
      height: 22,
      width: 22,
    },
    settingCopy: {
      flex: 1,
      gap: 4,
    },
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    sectionNav: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    sectionNavItem: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.primary,
      borderRadius: radii.chip,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    sectionNavItemActive: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderRadius: radii.chip,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    sectionNavLabel: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "800",
    },
    sectionNavLabelActive: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "800",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: radii.chip,
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    disabledButton: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: typography.body,
      fontWeight: "800",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.primary,
      borderRadius: radii.chip,
      borderWidth: 1,
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    secondaryButtonText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: typography.body,
      fontWeight: "800",
    },
  });
}
