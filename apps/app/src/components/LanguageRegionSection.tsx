import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChevronRight } from "@mobile/theme/icons";
import {
  LocaleOption,
} from "@mobile/components/CustomerLocaleRegionControl";
import { CustomerLocaleRegionSheet } from "@mobile/components/CustomerLocaleRegionSheet";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { useCopy } from "@mobile/i18n/useCopy";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { radii, spacing, typography } from "@mobile/theme/tokens";

/**
 * "Language & Country" for the Account Setting screen — which lives at the
 * /language route yet historically carried no language or region UI (the only
 * picker was the desktop header globe). Language switches inline; the country
 * row opens the same bottom sheet the mobile home header uses.
 */
export function LanguageRegionSection() {
  const tc = useCopy();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { locale, region, setLocale } = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);

  const active = webLocaleRegionPanel.regions.find((option) => option.code === region);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc("Language & Country")}</Text>
      <Text style={styles.helper}>{tc("Choose your language and the country you shop in.")}</Text>
      <View style={styles.languageRow}>
        {webLocaleRegionPanel.languages.map((language) => (
          <LocaleOption
            flag={language.flag}
            key={language.code}
            label={language.label}
            selected={locale === language.code}
            onPress={() => setLocale(language.code)}
          />
        ))}
      </View>
      <MotionPressable
        accessibilityLabel={tc("Change country")}
        accessibilityRole="button"
        onPress={() => setSheetOpen(true)}
        pressScale={motion.scale.subtlePress}
        style={styles.countryRow}
      >
        <Text style={styles.countryFlag}>{active?.flag ?? ""}</Text>
        <Text numberOfLines={1} style={styles.countryLabel}>
          {active?.label ?? region}
        </Text>
        <ChevronRight color={colors.muted} size={18} strokeWidth={1.75} />
      </MotionPressable>

      {sheetOpen ? <CustomerLocaleRegionSheet onClose={() => setSheetOpen(false)} /> : null}
    </View>
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
    languageRow: {
      gap: 2,
    },
    countryRow: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, colors.card, "rgba(255, 255, 255, 0.06)"),
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    countryFlag: {
      fontSize: 18,
      lineHeight: 20,
    },
    countryLabel: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.bodyWeight,
      lineHeight: 20,
      minWidth: 0,
    },
  });
}
