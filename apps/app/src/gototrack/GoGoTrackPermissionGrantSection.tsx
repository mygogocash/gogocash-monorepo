import { useEffect } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ShieldCheck as ShieldIcon } from "@mobile/theme/icons";
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
import {
  premiumCompactOutlineButtonStyle,
  premiumOutlineButtonDisabledStyle,
  premiumOutlineButtonStyle,
  premiumOutlineButtonTextDisabledStyle,
  premiumOutlineButtonTextStyle,
  premiumPanelCardStyle,
} from "@mobile/theme/premiumPanelCard";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

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
  const { colors } = useTheme();
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
        <View style={styles.heroIcon}>
          <ShieldIcon color={colors.white} size={28} strokeWidth={typography.iconStrokeWidth} />
        </View>
        <Text numberOfLines={1} style={styles.heroEyebrow}>
          {tc(webGoGoTrackPermissionsPage.hero.eyebrow)}
        </Text>
        <Text numberOfLines={2} style={styles.heroTitle}>
          {tc(webGoGoTrackPermissionsPage.hero.title)}
        </Text>
        <Text style={styles.heroBody}>{tc(webGoGoTrackPermissionsPage.hero.body)}</Text>
        <MotionPressable
          accessibilityRole="button"
          disabled={allPermissionsEnabled}
          hoverLift={false}
          onPress={() => void handleEnableAll()}
          pressScale={motion.scale.subtlePress}
          style={[styles.acceptButton, allPermissionsEnabled ? styles.acceptButtonDisabled : null]}
        >
          <Text
            style={[
              styles.acceptButtonText,
              allPermissionsEnabled ? styles.acceptButtonTextDisabled : null,
            ]}
          >
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
    heroCard: premiumPanelCardStyle(colors, {
      gap: spacing.sm,
      padding: spacing.lg,
    }),
    heroIcon: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 18,
      height: 52,
      justifyContent: "center",
      width: 52,
    },
    heroEyebrow: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    heroTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: typography.title,
      fontWeight: "700",
      lineHeight: 34,
    },
    heroBody: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.body,
      lineHeight: 22,
    },
    acceptButton: premiumOutlineButtonStyle(colors),
    acceptButtonDisabled: premiumOutlineButtonDisabledStyle(colors),
    acceptButtonText: premiumOutlineButtonTextStyle(colors),
    acceptButtonTextDisabled: premiumOutlineButtonTextDisabledStyle(colors),
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
    permissionCard: premiumPanelCardStyle(colors, {
      gap: spacing.lg,
      minHeight: 150,
      padding: spacing.lg,
    }),
    permissionCopy: {
      gap: spacing.sm,
    },
    permissionCardTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: typography.body,
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
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: typography.caption,
      fontWeight: "600",
      lineHeight: typography.captionLineHeight,
    },
    grantButton: premiumCompactOutlineButtonStyle(colors),
    grantButtonText: premiumOutlineButtonTextStyle(colors),
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
      // White in BOTH themes — the knob must contrast with the track, not
      // recede into the card (dark-mode colors.field made it invisible).
      backgroundColor: colors.white,
      borderRadius: radii.chip,
      boxShadow: pickThemed(colors, "0 1px 4px rgba(16, 37, 63, 0.2)", "none"),
      height: 28,
      marginLeft: -2,
      width: 28,
    },
    toggleThumbOn: {
      marginLeft: 20,
    },
    disclosureCard: premiumPanelCardStyle(colors, {
      gap: spacing.sm,
      padding: spacing.lg,
    }),
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
