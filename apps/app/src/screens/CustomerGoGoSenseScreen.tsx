import { Link } from "expo-router";
import {
  Activity as ActivityIcon,
  Bell as BellIcon,
  Camera as CameraIcon,
  CheckCircle2 as CheckIcon,
  Eye as EyeIcon,
  FileSearch as FileSearchIcon,
  LockKeyhole as LockIcon,
  Settings as SettingsIcon,
  ShieldCheck as ShieldIcon,
  Store as StoreIcon,
} from "@mobile/theme/icons";
import { useEffect, type ComponentType } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import {
  createUnsupportedGoGoSenseDetector,
  type GoGoSenseDetector,
} from "@mobile/gogosense/detector";
import { GoGoSenseDetectionBanner } from "@mobile/gogosense/GoGoSenseDetectionBanner";
import { useGoGoSense } from "@mobile/gogosense/useGoGoSense";
import { useGoGoSenseSettings } from "@mobile/gogosense/useGoGoSenseSettings";
import { useGoGoSenseTimeline } from "@mobile/gogosense/useGoGoSenseTimeline";

export type GoGoSenseFlowMode =
  | "hub"
  | "merchant"
  | "onboarding"
  | "permissions"
  | "recovery"
  | "settings"
  | "timeline";

type GoGoSenseIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

type GoGoSenseScreenProps = {
  merchantId?: string;
  mode: GoGoSenseFlowMode;
  // The live platform detector. Defaults to the unsupported no-op so render
  // tests + non-Android platforms stay safe; the Android routes inject the
  // native UsageStats detector (which can't be imported under the test harness).
  detector?: GoGoSenseDetector;
};

const gogoSenseFlowCopy = {
  hub: {
    eyebrow: "Protected tracking",
    title: "GoGoSense",
    body: "Cashback tracking assistant that watches supported shopping sessions and keeps activation evidence in one secure flow.",
  },
  onboarding: {
    eyebrow: "Native setup",
    title: "Set up GoGoSense",
    body: "Complete these steps before GoGoSense starts detecting supported stores, checkout sessions, and missing cashback evidence.",
  },
  permissions: {
    eyebrow: "Consent first",
    title: "Permission checklist",
    body: "GoGoSense never enables sensitive signals silently. Review why each permission is needed before opening device settings.",
  },
  timeline: {
    eyebrow: "Tracking history",
    title: "Tracking timeline",
    body: "Review detected shopping sessions, activation status, and recovery tasks without exposing raw notification or screenshot content.",
  },
  settings: {
    eyebrow: "Privacy controls",
    title: "Tracking controls",
    body: "Tune GoGoSense detection sources and data minimization before the native detector is enabled.",
  },
  recovery: {
    eyebrow: "Manual proof",
    title: "Screenshot recovery",
    body: "Use recovery when a shopping session was not detected or a merchant asks for proof before validating cashback.",
  },
  merchant: {
    eyebrow: "Merchant detail",
    title: "Merchant tracking detail",
    body: "Check supported detection methods, activation status, and recovery options for this merchant.",
  },
} as const;

const permissionRows = [
  {
    title: "Usage access",
    body: "Detect supported shopping apps and browser transitions.",
    icon: EyeIcon,
  },
  {
    title: "Notification listener",
    body: "Read only merchant tracking notifications needed for cashback evidence.",
    icon: BellIcon,
  },
  {
    title: "Screenshot recovery",
    body: "Allow user-submitted screenshots only when automatic tracking fails.",
    icon: CameraIcon,
  },
] as const;

const timelineRows = [
  {
    title: "Detected shopping session",
    body: "Grocery Galaxy opened from GoGoCash at 08:42.",
    status: "Captured",
  },
  {
    title: "Activation event",
    body: "Cashback click ID linked to merchant session.",
    status: "Protected",
  },
  {
    title: "Cashback pending",
    body: "Waiting for merchant confirmation before wallet credit.",
    status: "Pending",
  },
] as const;

const setupRows = [
  "Install native detector",
  "Connect browser and app signals",
  "Review permission rationale",
  "Run first supported merchant check",
] as const;

const settingRows = [
  {
    title: "Usage access detection",
    body: "Use app and browser transitions for supported merchant sessions.",
    field: "usageStatsEnabled",
  },
  {
    title: "Notification listener",
    body: "Capture merchant confirmation notices after checkout.",
    field: "notificationListenerEnabled",
  },
  {
    title: "PII minimization",
    body: "Redact notification and screenshot data before upload.",
    field: "screenshotRecoveryEnabled",
  },
] as const;

export function CustomerGoGoSenseScreen({
  merchantId,
  mode,
  detector = createUnsupportedGoGoSenseDetector(),
}: GoGoSenseScreenProps) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const copy = gogoSenseFlowCopy[mode];
  const topPadding = Math.max(spacing.md, insets.top + spacing.md);
  const bottomPadding = Math.max(
    mobileShellLayout.bottomNavClearance,
    insets.bottom + spacing.xl
  );

  return (
    <View style={styles.viewport}>
      <View style={styles.phoneFrame}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            {
              paddingBottom: bottomPadding,
              paddingTop: topPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <ShieldIcon
                color={colors.white}
                size={28}
                strokeWidth={typography.iconStrokeWidth}
              />
            </View>
            <Text
              numberOfLines={1}
              style={styles.eyebrow}
            >
              {tc(copy.eyebrow)}
            </Text>
            <Text
              numberOfLines={1}
              style={styles.title}
            >
              {tc(copy.title)}
            </Text>
            <Text style={styles.body}>{tc(copy.body)}</Text>
            {merchantId ? (
              <View style={styles.merchantIdPill}>
                <Text style={styles.merchantIdLabel}>merchantId</Text>
                <Text style={styles.merchantIdValue}>{merchantId}</Text>
              </View>
            ) : null}
          </View>

          {mode === "hub" ? <HubContent detector={detector} /> : null}
          {mode === "onboarding" ? <OnboardingContent /> : null}
          {mode === "permissions" ? <PermissionsContent detector={detector} /> : null}
          {mode === "timeline" ? <TimelineContent /> : null}
          {mode === "settings" ? <SettingsContent /> : null}
          {mode === "recovery" ? <RecoveryContent /> : null}
          {mode === "merchant" ? <MerchantContent /> : null}
          <CustomerDesktopFooterSlot style={styles.desktopFooter} />
        </ScrollView>
      </View>
    </View>
  );
}

function HubContent({ detector }: { detector: GoGoSenseDetector }) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  return (
    <>
      <GoGoSenseDetectionBanner detector={detector} />
      <View style={styles.card}>
        <SectionHeader
          icon={LockIcon}
          subtitle="Native detection stays disabled until the customer reviews each permission."
          title="Permission checklist"
        />
        <View style={styles.permissionGrid}>
          {permissionRows.map((row) => (
            <InfoRow body={row.body} icon={row.icon} key={row.title} title={row.title} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader
          icon={ActivityIcon}
          subtitle="Recent sessions stay visible so missing cashback can be recovered quickly."
          title="Tracking timeline"
        />
        {timelineRows.map((row) => (
          <TimelineRow body={row.body} key={row.title} status={row.status} title={row.title} />
        ))}
      </View>

      <View style={styles.actionGrid}>
        <PrimaryLink href="/gogosense/onboarding" label="Start setup" />
        <SecondaryLink href="/gogosense/permissions" label="Permissions" />
        <SecondaryLink href="/gogosense/timeline" label="Timeline" />
        <SecondaryLink href="/gogosense/settings" label="Settings" />
        <SecondaryLink href="/gogosense/recovery" label="Recovery" />
      </View>
    </>
  );
}

function OnboardingContent() {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const tc = useCopy();
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={CheckIcon}
          subtitle="Every step is explicit so GoGoSense never looks like a hidden tracker."
          title="Set up GoGoSense"
        />
        {setupRows.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <Text style={styles.stepText}>{tc(step)}</Text>
          </View>
        ))}
      </View>
      <PrimaryLink href="/gogosense/permissions" label="Continue to permissions" />
    </>
  );
}

function PermissionsContent({ detector }: { detector: GoGoSenseDetector }) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={LockIcon}
          subtitle="These controls map to native OS permission prompts and privacy-policy wording."
          title="Permission checklist"
        />
        <View style={styles.permissionGrid}>
          {permissionRows.map((row) => (
            <InfoRow body={row.body} icon={row.icon} key={row.title} title={row.title} />
          ))}
        </View>
      </View>
      <UsageAccessControl detector={detector} />
      <View style={styles.actionGrid}>
        <PrimaryLink href="/gogosense/settings" label="Open settings" />
        <SecondaryLink href="/gogosense/timeline" label="View timeline" />
      </View>
    </>
  );
}

// No-op api: the permissions screen only manages Usage-Access (detector-only);
// detection (detect/activate) is wired with the authed api in a later step.
const permissionsScopeApi = {
  detect: async () => ({ matched: false }),
};

function UsageAccessControl({ detector }: { detector: GoGoSenseDetector }) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const tc = useCopy();
  const { state, refreshPermission, requestPermission } = useGoGoSense({
    detector,
    api: permissionsScopeApi,
  });

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const statusLabel = !state.supported
    ? "Usage access is only available on Android"
    : state.permissionGranted
      ? "Usage access granted"
      : "Usage access not granted yet";

  const canGrant = state.supported && !state.permissionGranted;

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={EyeIcon}
        subtitle="GoGoSense uses Android Usage Access to detect supported shopping apps. Nothing is read until you grant access."
        title="Usage access"
      />
      <Text numberOfLines={1} style={styles.rowTitle}>
        {tc(statusLabel)}
      </Text>
      {canGrant ? (
        <MotionPressable
          onPress={() => {
            // Opens the OS Usage-Access settings screen; the status refreshes
            // when the customer returns to GoGoCash.
            void haptics.impact();
            void requestPermission();
          }}
          pressScale={motion.scale.subtlePress}
          style={styles.primaryButton}
        >
          <Text numberOfLines={1} style={styles.primaryButtonText}>
            {tc("Grant usage access")}
          </Text>
        </MotionPressable>
      ) : null}
    </View>
  );
}

function TimelineContent({ api }: { api?: { getTimeline(): Promise<unknown> } | null } = {}) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const liveEntries = useGoGoSenseTimeline(api);
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={ActivityIcon}
          subtitle="Only the state needed for cashback support is shown here."
          title="Tracking timeline"
        />
        {liveEntries
          ? liveEntries.map((entry) => (
              <TimelineRow
                body={entry.body}
                key={entry.id}
                status={entry.status}
                title={entry.title}
              />
            ))
          : timelineRows.map((row) => (
              <TimelineRow body={row.body} key={row.title} status={row.status} title={row.title} />
            ))}
      </View>
      <View style={styles.actionGrid}>
        <PrimaryLink href="/gogosense/recovery" label="Start recovery" />
        <SecondaryLink href="/gogosense/settings" label="Tracking settings" />
      </View>
    </>
  );
}

function SettingsContent() {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { settings, setField } = useGoGoSenseSettings();
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
              onValueChange={(value) => setField(row.field, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              value={settings[row.field]}
            />
            <View style={styles.settingCopy}>
              <Text
                numberOfLines={1}
                style={styles.rowTitle}
              >
                {tc(row.title)}
              </Text>
              <Text style={styles.rowBody}>{tc(row.body)}</Text>
            </View>
          </View>
        ))}
      </View>
      <SecondaryLink href="/gogosense/permissions" label="Permission checklist" />
    </>
  );
}

function RecoveryContent() {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={FileSearchIcon}
          subtitle="Recovery accepts customer-provided evidence only after automatic tracking misses."
          title="Screenshot recovery"
        />
        <InfoRow
          body="Submit one receipt or checkout screenshot for review."
          icon={CameraIcon}
          title="Upload receipt screenshot"
        />
        <InfoRow
          body="Support can compare the screenshot to the merchant tracking window."
          icon={StoreIcon}
          title="Manual merchant review"
        />
      </View>
      <PrimaryLink href="/gogosense/timeline" label="Back to timeline" />
    </>
  );
}

function MerchantContent() {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={StoreIcon}
          subtitle="Merchant support is explicit so unsupported flows do not look tracked."
          title="Detection methods"
        />
        <InfoRow
          body="GoGoLink activation, supported app transitions, and merchant notification matching."
          icon={ActivityIcon}
          title="Supported signals"
        />
        <InfoRow
          body="Use recovery when the session is missing from the timeline."
          icon={FileSearchIcon}
          title="Cashback evidence"
        />
      </View>
      <View style={styles.actionGrid}>
        <PrimaryLink href="/gogosense/timeline" label="View timeline" />
        <SecondaryLink href="/gogosense/recovery" label="Start recovery" />
      </View>
    </>
  );
}

function SectionHeader({
  icon: Icon,
  subtitle,
  title,
}: {
  icon: GoGoSenseIcon;
  subtitle: string;
  title: string;
}) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Icon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <View style={styles.sectionCopy}>
        <Text
          numberOfLines={1}
          style={styles.sectionTitle}
        >
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
  icon: GoGoSenseIcon;
  title: string;
}) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon color={colors.primaryDark} size={18} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <View style={styles.infoCopy}>
        <Text
          numberOfLines={1}
          style={styles.rowTitle}
        >
          {tc(title)}
        </Text>
        <Text style={styles.rowBody}>{tc(body)}</Text>
      </View>
    </View>
  );
}

function TimelineRow({ body, status, title }: { body: string; status: string; title: string }) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineCopy}>
        <View style={styles.timelineTitleRow}>
          <Text
            numberOfLines={1}
            style={styles.rowTitle}
          >
            {tc(title)}
          </Text>
          <Text
            numberOfLines={1}
            style={styles.timelineStatus}
          >
            {tc(status)}
          </Text>
        </View>
        <Text style={styles.rowBody}>{tc(body)}</Text>
      </View>
    </View>
  );
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
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
  const styles = useThemedStyles(createGoGoSenseScreenStyles);
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

function createGoGoSenseScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  phoneFrame: {
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: mobileShellLayout.contentMaxWidth,
    width: "100%",
  },
  page: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  desktopFooter: {
    marginTop: 64,
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
  timelineRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  timelineDot: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  timelineCopy: {
    flex: 1,
    gap: 4,
  },
  timelineTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  timelineStatus: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: "800",
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
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
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

