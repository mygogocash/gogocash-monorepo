import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCopy } from "@mobile/i18n/useCopy";
import { webAccountSettingsPage } from "@mobile/design/webDesignParity";
import { useTheme } from "@mobile/theme/ThemeProvider";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import type { ThemePreference } from "@mobile/theme/themePreference";
import { radii, spacing, typography } from "@mobile/theme/tokens";

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
        style={styles.segmentRow}
      >
        {webAccountSettingsPage.appearance.options.map((option) => (
          <AppearanceOption
            key={option.id}
            label={tc(option.label)}
            onSelect={() => setPreference(option.id as ThemePreference)}
            selected={preference === option.id}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
}

function AppearanceOption({
  label,
  onSelect,
  selected,
  styles,
}: {
  label: string;
  onSelect: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onSelect}
      style={[styles.segment, selected ? styles.segmentSelected : null]}
    >
      <Text style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
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
    segmentRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    segment: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexGrow: 1,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 100,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    segmentSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    segmentLabel: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
    },
    segmentLabelSelected: {
      color: colors.accent,
      fontWeight: "600",
    },
  });
}
