import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  LocaleOption,
  LocaleSectionTitle,
} from "@mobile/components/CustomerLocaleRegionControl";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing } from "@mobile/theme/tokens";

/**
 * Bottom-sheet edition of the desktop header globe panel — same
 * `webLocaleRegionPanel` data and option rows, presented as a scrim + bottom
 * card for mobile/tablet chrome (the 288px absolute popover doesn't belong on
 * phone layouts). Picking a market closes the sheet (the primary action);
 * picking a language keeps it open so the market pick can follow.
 */
export function CustomerLocaleRegionSheet({ onClose }: { onClose: () => void }) {
  const styles = useThemedStyles(createLocaleRegionSheetStyles);
  const { locale, region, setLocale, setRegion } = useLocale();

  return (
    <Modal animationType="none" statusBarTranslucent transparent visible>
      <View style={styles.sheetRoot}>
        <Pressable
          accessibilityLabel="Close language and region"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.sheetScrim}
        />
        <View
          {...({ role: "dialog" } as const)}
          accessibilityLabel={webLocaleRegionPanel.ariaLabel}
          style={styles.sheetCard}
        >
          <View style={styles.sheetGrabber} />
          <LocaleSectionTitle>{webLocaleRegionPanel.sections.language}</LocaleSectionTitle>
          <View style={styles.sheetOptionStack}>
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
          <View style={styles.sheetDivider} />
          <LocaleSectionTitle>{webLocaleRegionPanel.sections.region}</LocaleSectionTitle>
          <ScrollView
            contentContainerStyle={styles.sheetRegionList}
            showsVerticalScrollIndicator
            style={styles.sheetRegionScroller}
          >
            {webLocaleRegionPanel.regions.map((regionOption) => (
              <LocaleOption
                flag={regionOption.flag}
                key={regionOption.code}
                label={regionOption.label}
                selected={region === regionOption.code}
                onPress={() => {
                  setRegion(regionOption.code);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createLocaleRegionSheetStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetScrim: {
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      borderWidth: 1,
      maxHeight: "78%",
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    sheetGrabber: {
      alignSelf: "center",
      backgroundColor: pickThemed(colors, colors.fieldMuted, colors.borderStrong),
      borderRadius: 999,
      height: 4,
      marginBottom: spacing.md,
      width: 36,
    },
    sheetOptionStack: {
      gap: 2,
      marginTop: spacing.xs,
    },
    sheetDivider: {
      backgroundColor: colors.fieldMuted,
      height: 1,
      marginVertical: spacing.md,
    },
    sheetRegionScroller: {
      marginTop: spacing.xs,
    },
    sheetRegionList: {
      gap: 2,
      paddingBottom: spacing.sm,
    },
  });
}
