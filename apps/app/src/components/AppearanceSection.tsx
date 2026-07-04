import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { webAccountSettingsPage } from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { DeviceMobile, Moon, Sun, type IconComponent } from "@mobile/theme/icons";
import { useTheme } from "@mobile/theme/ThemeProvider";
import type { ThemePreference } from "@mobile/theme/themePreference";
import { radii, spacing, typography } from "@mobile/theme/tokens";

const APPEARANCE_OPTION_ICONS: Record<ThemePreference, IconComponent> = {
  system: DeviceMobile,
  light: Sun,
  dark: Moon,
};

export function AppearanceSection() {
  const tc = useCopy();
  const { preference, colors, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(webAccountSettingsPage.appearance.title)}</Text>
      <Text style={styles.helper}>{tc(webAccountSettingsPage.appearance.helper)}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={tc(webAccountSettingsPage.appearance.title)}
        style={styles.segmentTrack}
      >
        {webAccountSettingsPage.appearance.options.map((option) => {
          const optionId = option.id as ThemePreference;
          return (
            <AppearanceOption
              key={option.id}
              icon={APPEARANCE_OPTION_ICONS[optionId]}
              label={tc(option.label)}
              onSelect={() => setPreference(optionId)}
              selected={preference === option.id}
              styles={styles}
            />
          );
        })}
      </View>
    </View>
  );
}

function AppearanceOption({
  icon: Icon,
  label,
  onSelect,
  selected,
  styles,
}: {
  icon: IconComponent;
  label: string;
  onSelect: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useTheme();
  const iconColor = selected ? colors.primaryDark : colors.muted;
  const [hovered, setHovered] = useState(false);

  return (
    <MotionPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      hoverLift={false}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onSelect}
      style={[
        styles.segment,
        selected ? styles.segmentSelected : null,
        !selected && hovered ? styles.segmentHovered : null,
      ]}
    >
      <View style={styles.segmentContent}>
        <Icon color={iconColor} size={18} strokeWidth={selected ? 2 : 1.75} />
        <Text
          numberOfLines={2}
          style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}
        >
          {label}
        </Text>
      </View>
    </MotionPressable>
  );
}

function createStyles(colors: ThemeColors) {
  const segmentShadow = pickThemed(
    colors,
    "0 2px 10px rgba(16, 53, 34, 0.1)",
    "0 2px 10px rgba(0, 0, 0, 0.35)",
  );

  return StyleSheet.create({
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
    helper: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      lineHeight: 20,
    },
    segmentTrack: {
      backgroundColor: pickThemed(colors, "#E8EFEB", colors.fieldMuted),
      borderRadius: radii.lg,
      flexDirection: "row",
      gap: 2,
      padding: 3,
      width: "100%",
    },
    segment: {
      alignItems: "center",
      borderColor: "transparent",
      borderRadius: radii.md,
      borderWidth: 1,
      flex: 1,
      flexBasis: 0,
      justifyContent: "center",
      minHeight: 52,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    segmentHovered: {
      backgroundColor: pickThemed(colors, "rgba(255, 255, 255, 0.45)", "rgba(255, 255, 255, 0.06)"),
    },
    segmentSelected: {
      backgroundColor: colors.card,
      borderColor: pickThemed(colors, "rgba(0, 204, 153, 0.18)", colors.borderStrong),
      boxShadow: segmentShadow,
    },
    segmentContent: {
      alignItems: "center",
      gap: 4,
      justifyContent: "center",
      maxWidth: "100%",
    },
    segmentLabel: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "500",
      letterSpacing: 0.1,
      lineHeight: 16,
      textAlign: "center",
    },
    segmentLabelSelected: {
      color: colors.primaryDark,
      fontWeight: "600",
    },
  });
}
