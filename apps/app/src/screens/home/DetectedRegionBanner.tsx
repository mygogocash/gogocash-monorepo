import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { X as CloseIcon } from "@mobile/theme/icons";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";
import { useRegion } from "@mobile/i18n/LocaleProvider";
import {
  readRegionBannerDismissed,
  writeRegionBannerDismissed,
} from "@mobile/i18n/regionStorage";
import { useCopy } from "@mobile/i18n/useCopy";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { motion } from "@mobile/theme/motion";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

/**
 * One-time confirm strip for the DETECTED (never user-confirmed) region:
 * "Showing deals for Malaysia 🇲🇾 — Change". Renders only while
 * `regionSource === "detected"` and never after a dismiss (persisted).
 * An explicit region pick flips the source to "user", retiring it forever.
 */
export function DetectedRegionBanner({ onChangePress }: { onChangePress: () => void }) {
  const styles = useThemedStyles(createDetectedRegionBannerStyles);
  const tc = useCopy();
  const { region, regionSource } = useRegion();
  // null = dismissal state still loading — render nothing rather than flashing.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void readRegionBannerDismissed().then((value) => {
      if (active) {
        setDismissed(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (regionSource !== "detected" || dismissed !== false) {
    return null;
  }

  const option = webLocaleRegionPanel.regions.find((candidate) => candidate.code === region);
  const label = option ? `${option.label} ${option.flag}` : region;

  return (
    <View style={styles.bannerRow}>
      <Text numberOfLines={1} style={styles.bannerText}>
        {`${tc("Showing deals for")} ${label}`}
      </Text>
      <MotionPressable
        accessibilityRole="button"
        onPress={onChangePress}
        pressScale={motion.scale.subtlePress}
        style={styles.bannerChangeButton}
      >
        <Text style={styles.bannerChangeText}>{tc("Change")}</Text>
      </MotionPressable>
      <Pressable
        accessibilityLabel={tc("Dismiss region notice")}
        accessibilityRole="button"
        onPress={() => {
          setDismissed(true);
          void writeRegionBannerDismissed();
        }}
        style={styles.bannerDismissButton}
      >
        <CloseIcon color={styles.bannerText.color as string} size={14} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function createDetectedRegionBannerStyles(colors: ThemeColors) {
  const inkOnHeader = pickThemed(colors, "#303846", "rgba(255, 255, 255, 0.92)");
  return StyleSheet.create({
    bannerRow: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, "rgba(255, 255, 255, 0.65)", "rgba(255, 255, 255, 0.12)"),
      borderRadius: radii.md,
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    bannerText: {
      color: inkOnHeader,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 13,
      fontWeight: typography.bodyWeight,
      minWidth: 0,
    },
    bannerChangeButton: {
      paddingVertical: 4,
    },
    bannerChangeText: {
      color: pickThemed(colors, colors.primaryDark, colors.primary),
      fontFamily: typography.family,
      fontSize: 13,
      fontWeight: "600",
    },
    bannerDismissButton: {
      alignItems: "center",
      height: 24,
      justifyContent: "center",
      width: 24,
    },
  });
}
