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
import type { ComponentType } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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
  },
  {
    title: "Notification listener",
    body: "Capture merchant confirmation notices after checkout.",
  },
  {
    title: "PII minimization",
    body: "Redact notification and screenshot data before upload.",
  },
] as const;

export function CustomerGoGoSenseScreen({ merchantId, mode }: GoGoSenseScreenProps) {
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
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>
            {merchantId ? (
              <View style={styles.merchantIdPill}>
                <Text style={styles.merchantIdLabel}>merchantId</Text>
                <Text style={styles.merchantIdValue}>{merchantId}</Text>
              </View>
            ) : null}
          </View>

          {mode === "hub" ? <HubContent /> : null}
          {mode === "onboarding" ? <OnboardingContent /> : null}
          {mode === "permissions" ? <PermissionsContent /> : null}
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

function HubContent() {
  return (
    <>
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
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      <PrimaryLink href="/gogosense/permissions" label="Continue to permissions" />
    </>
  );
}

function PermissionsContent() {
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
      <View style={styles.actionGrid}>
        <PrimaryLink href="/gogosense/settings" label="Open settings" />
        <SecondaryLink href="/gogosense/timeline" label="View timeline" />
      </View>
    </>
  );
}

function TimelineContent() {
  return (
    <>
      <View style={styles.card}>
        <SectionHeader
          icon={ActivityIcon}
          subtitle="Only the state needed for cashback support is shown here."
          title="Tracking timeline"
        />
        {timelineRows.map((row) => (
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
            <View style={styles.settingSwitch}>
              <View style={styles.settingSwitchKnob} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowBody}>{row.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <SecondaryLink href="/gogosense/permissions" label="Permission checklist" />
    </>
  );
}

function RecoveryContent() {
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
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Icon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
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
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon color={colors.primaryDark} size={18} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </View>
  );
}

function TimelineRow({ body, status, title }: { body: string; status: string; title: string }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineCopy}>
        <View style={styles.timelineTitleRow}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.timelineStatus}>{status}</Text>
        </View>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </View>
  );
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link asChild href={href as never}>
      <MotionPressable pressScale={motion.scale.subtlePress} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{label}</Text>
      </MotionPressable>
    </Link>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link asChild href={href as never}>
      <MotionPressable pressScale={motion.scale.subtlePress} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{label}</Text>
      </MotionPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.white,
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
