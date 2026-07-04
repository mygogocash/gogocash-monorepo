import { useEffect } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { webGoGoTrackPermissionsPage } from "@mobile/design/webDesignParity";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { toastErrorMessages } from "@mobile/i18n/toastMessages";
import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { useGoGoTrack } from "@mobile/gototrack/useGoGoTrack";
import {
  type GoGoTrackSettingsField,
  useGoGoTrackSettings,
} from "@mobile/gototrack/useGoGoTrackSettings";
import { haptics } from "@mobile/lib/haptics";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { motion } from "@mobile/theme/motion";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type PermissionItem = (typeof webGoGoTrackPermissionsPage.items)[number];
type TogglePermissionItem = Extract<PermissionItem, { kind: "toggle" }>;

const permissionsScopeApi = {
  detect: async () => ({ matched: false }),
};

type GoGoTrackPermissionGrantSectionProps = {
  detector: GoGoTrackDetector;
};

export function GoGoTrackPermissionDisclosure() {
  const styles = useThemedStyles(createGrantSectionStyles);
  const tc = useCopy();
  const { disclosure } = webGoGoTrackPermissionsPage;

  return (
    <View style={styles.disclosureCard}>
      <Text style={styles.disclosureTitle}>{tc(disclosure.title)}</Text>
      <Text style={styles.disclosureBody}>{tc(disclosure.body)}</Text>
    </View>
  );
}

export function GoGoTrackPermissionGrantSection({
  detector,
}: GoGoTrackPermissionGrantSectionProps) {
  const styles = useThemedStyles(createGrantSectionStyles);
  const tc = useCopy();
  const toast = useToast();
  const { settings, setField } = useGoGoTrackSettings(undefined, {
    onPersistError: () => toast.show(tc(toastErrorMessages.saveGoGoTrackSettingsFailed)),
  });
  const heroHintCopy =
    Platform.OS === "web"
      ? webGoGoTrackPermissionsPage.hero.hintWeb
      : webGoGoTrackPermissionsPage.hero.hint;
  const { state, refreshPermission, requestPermission } = useGoGoTrack({
    detector,
    api: permissionsScopeApi,
  });

  useEffect(() => {
    void refreshPermission();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refreshPermission();
      }
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const usageAccessGranted = state.supported && state.permissionGranted;
  const usageAccessItem = webGoGoTrackPermissionsPage.items.find(
    (item) => item.id === "usageAccess",
  );
  const toggleItems = webGoGoTrackPermissionsPage.items.filter(
    (item): item is TogglePermissionItem => item.kind === "toggle",
  );

  const togglePreferencesEnabled = toggleItems.every((item) => settings[item.field]);
  const allPermissionsEnabled = state.supported
    ? usageAccessGranted && togglePreferencesEnabled
    : togglePreferencesEnabled;

  async function handleEnableAll() {
    void haptics.impact();
    if (state.supported && !usageAccessGranted) {
      await requestPermission();
      return;
    }
    void setField("backgroundPromptsEnabled", true);
    if (state.supported && usageAccessGranted) {
      void setField("usageStatsEnabled", true);
    }
    void setField("screenshotRecoveryEnabled", true);
  }

  async function handleToggle(field: GoGoTrackSettingsField) {
    void haptics.impact();
    const nextValue = !settings[field];

    if (nextValue && field === "backgroundPromptsEnabled" && state.supported) {
      const granted = await detector.hasUsageAccessPermission();
      if (!granted) {
        await requestPermission();
        return;
      }
      void setField("backgroundPromptsEnabled", true);
      void setField("usageStatsEnabled", true);
      return;
    }

    void setField(field, nextValue);
  }

  const usageStatusLabel = !state.supported
    ? webGoGoTrackPermissionsPage.usageAccessAndroidOnlyLabel
    : state.permissionGranted
      ? webGoGoTrackPermissionsPage.usageAccessGrantedLabel
      : webGoGoTrackPermissionsPage.usageAccessNotGrantedLabel;

  const canGrantUsageAccess = state.supported && !state.permissionGranted;

  return (
    <View style={styles.section}>
      <View style={styles.sectionIntro}>
        <Text style={styles.sectionTitle}>
          {tc(webGoGoTrackPermissionsPage.sectionTitle)}
        </Text>
        <Text style={styles.microNotice}>
          {tc(webGoGoTrackPermissionsPage.microNotice)}
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{tc(webGoGoTrackPermissionsPage.hero.title)}</Text>
          <Text style={styles.heroBody}>{tc(webGoGoTrackPermissionsPage.hero.body)}</Text>
        </View>
        <MotionPressable
          accessibilityRole="button"
          disabled={allPermissionsEnabled}
          onPress={() => void handleEnableAll()}
          pressScale={0.98}
          style={[styles.acceptButton, allPermissionsEnabled ? styles.acceptButtonDisabled : null]}
        >
          <Text style={styles.acceptButtonText}>
            {allPermissionsEnabled
              ? tc(webGoGoTrackPermissionsPage.hero.allEnabledLabel)
              : tc(webGoGoTrackPermissionsPage.hero.actionLabel)}
          </Text>
        </MotionPressable>
        <Text style={styles.heroHint}>{tc(heroHintCopy)}</Text>
      </View>

      <View style={styles.permissionsSection}>
        <Text style={styles.permissionsTitle}>
          {tc(webGoGoTrackPermissionsPage.permissionsTitle)}
        </Text>
        <View style={styles.permissionStack}>
          {usageAccessItem ? (
            <View style={styles.permissionCard}>
              <View style={styles.permissionCopy}>
                <Text style={styles.permissionCardTitle}>{tc(usageAccessItem.title)}</Text>
                <Text style={styles.permissionCardDescription}>
                  {tc(usageAccessItem.description)}
                </Text>
                <Text style={styles.permissionStatus}>{tc(usageStatusLabel)}</Text>
              </View>
              {canGrantUsageAccess ? (
                <MotionPressable
                  accessibilityRole="button"
                  onPress={() => {
                    void haptics.impact();
                    void requestPermission();
                  }}
                  pressScale={motion.scale.subtlePress}
                  style={styles.grantButton}
                >
                  <Text style={styles.grantButtonText}>
                    {tc(webGoGoTrackPermissionsPage.grantUsageAccessLabel)}
                  </Text>
                </MotionPressable>
              ) : state.permissionGranted ? (
                <Text style={styles.grantedBadge}>
                  {tc(webGoGoTrackPermissionsPage.grantedLabel)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {toggleItems.map((item) => {
            const showUsageAccessHint =
              "requiresUsageAccess" in item &&
              item.requiresUsageAccess === true &&
              !usageAccessGranted;
            const usageAccessHint = state.supported
              ? webGoGoTrackPermissionsPage.backgroundPromptsPendingUsageAccessHint
              : webGoGoTrackPermissionsPage.requiresUsageAccessHint;
            const enabled = settings[item.field];

            return (
              <View key={item.id} style={styles.permissionCard}>
                <View style={styles.permissionCopy}>
                  <Text style={styles.permissionCardTitle}>{tc(item.title)}</Text>
                  <Text style={styles.permissionCardDescription}>
                    {tc(item.description)}
                  </Text>
                  {showUsageAccessHint ? (
                    <Text style={styles.blockedHint}>{tc(usageAccessHint)}</Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel={tc(item.title)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: enabled }}
                  onPress={() => {
                    void handleToggle(item.field);
                  }}
                  style={styles.toggleRow}
                >
                  <Text style={styles.toggleLabel}>
                    {enabled
                      ? tc(webGoGoTrackPermissionsPage.onLabel)
                      : tc(webGoGoTrackPermissionsPage.offLabel)}
                  </Text>
                  <View style={[styles.toggleTrack, enabled ? styles.toggleTrackOn : null]}>
                    <View style={[styles.toggleThumb, enabled ? styles.toggleThumbOn : null]} />
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function createGrantSectionStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      gap: 28,
      width: "100%",
    },
    sectionIntro: {
      gap: 6,
    },
    sectionTitle: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 29,
    },
    microNotice: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 17,
      lineHeight: 27,
    },
    heroCard: {
      backgroundColor: pickThemed(colors, colors.primarySoft, colors.fieldMuted),
      borderColor: pickThemed(colors, "#D1FAE5", colors.border),
      borderRadius: 18,
      borderWidth: 1,
      boxShadow: pickThemed(colors, "0 2px 8px rgba(16, 53, 34, 0.12)", shadows.cardCss),
      gap: 18,
      paddingHorizontal: 18,
      paddingVertical: 20,
    },
    heroCopy: {
      gap: 4,
    },
    heroTitle: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 26,
    },
    heroBody: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 17,
      lineHeight: 27,
    },
    acceptButton: {
      alignItems: "center",
      backgroundColor: colors.primaryDark,
      borderRadius: radii.chip,
      justifyContent: "center",
      minHeight: 58,
      paddingHorizontal: spacing.lg,
    },
    acceptButtonDisabled: {
      backgroundColor: pickThemed(colors, "#79D8C0", colors.borderStrong),
    },
    acceptButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 19,
      fontWeight: "700",
      lineHeight: 24,
      textAlign: "center",
    },
    heroHint: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 15,
      lineHeight: 22,
    },
    permissionsSection: {
      gap: 8,
    },
    permissionsTitle: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 21,
      fontWeight: "500",
      lineHeight: 28,
    },
    permissionStack: {
      gap: 14,
    },
    permissionCard: {
      backgroundColor: pickThemed(colors, colors.primarySoft, colors.fieldMuted),
      borderColor: pickThemed(colors, "#D1FAE5", colors.border),
      borderRadius: 18,
      borderWidth: 1,
      gap: spacing.lg,
      minHeight: 150,
      paddingHorizontal: 18,
      paddingVertical: 20,
    },
    permissionCopy: {
      gap: spacing.sm,
    },
    permissionCardTitle: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 17,
      fontWeight: "600",
      lineHeight: 23,
    },
    permissionCardDescription: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 16,
      lineHeight: 25,
    },
    permissionStatus: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 22,
    },
    grantButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.primaryDark,
      borderRadius: radii.chip,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: spacing.lg,
    },
    grantButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: typography.body,
      fontWeight: "800",
    },
    grantedBadge: {
      alignSelf: "flex-start",
      backgroundColor: pickThemed(colors, "#CFF5EA", colors.primarySoft),
      borderRadius: radii.chip,
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
      overflow: "hidden",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    blockedHint: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontStyle: "italic",
      lineHeight: 20,
    },
    toggleRow: {
      alignItems: "center",
      alignSelf: "flex-end",
      flexDirection: "row",
      gap: spacing.sm,
    },
    toggleLabel: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 16,
      lineHeight: 22,
    },
    toggleTrack: {
      backgroundColor: colors.border,
      borderRadius: radii.chip,
      height: 24,
      justifyContent: "center",
      paddingHorizontal: 2,
      width: 48,
    },
    toggleTrackOn: {
      backgroundColor: colors.primaryDark,
    },
    toggleThumb: {
      backgroundColor: pickThemed(colors, colors.white, colors.field),
      borderRadius: radii.chip,
      boxShadow: pickThemed(colors, "0 1px 4px rgba(16, 37, 63, 0.2)", "none"),
      height: 28,
      marginLeft: -2,
      width: 28,
    },
    toggleThumbOn: {
      marginLeft: 20,
    },
    disclosureCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      boxShadow: shadows.cardCss,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    disclosureTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 24,
    },
    disclosureBody: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.caption,
      lineHeight: 18,
    },
  });
}
