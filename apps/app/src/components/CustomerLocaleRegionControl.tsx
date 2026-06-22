import { useEffect, useMemo, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { Globe } from "@mobile/theme/icons";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, typography } from "@mobile/theme/tokens";

type LocaleRegionCode = (typeof webLocaleRegionPanel.regions)[number]["code"];

type CustomerLocaleRegionControlProps = {
  readonly onExpandedChange?: (expanded: boolean) => void;
};

export function CustomerLocaleRegionControl({
  onExpandedChange,
}: CustomerLocaleRegionControlProps) {
  const styles = useThemedStyles(createLocaleRegionControlStyles);
  const [localePanelOpen, setLocalePanelOpen] = useState(false);
  const [localePanelMounted, setLocalePanelMounted] = useState(false);
  const { locale, setLocale } = useLocale();
  const [selectedRegion, setSelectedRegion] = useState<LocaleRegionCode>(
    webLocaleRegionPanel.defaultRegion
  );
  const localePanelProgress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    onExpandedChange?.(localePanelOpen || localePanelMounted);
  }, [localePanelMounted, localePanelOpen, onExpandedChange]);

  useEffect(() => {
    localePanelProgress.stopAnimation();

    if (localePanelOpen) {
      setLocalePanelMounted(true);
      Animated.timing(localePanelProgress, {
        duration: motion.duration.base,
        easing: motion.easing.out,
        toValue: 1,
        useNativeDriver: motion.useNativeDriver,
      }).start();

      return () => localePanelProgress.stopAnimation();
    }

    if (localePanelMounted) {
      Animated.timing(localePanelProgress, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: 0,
        useNativeDriver: motion.useNativeDriver,
      }).start(({ finished }) => {
        if (finished) {
          setLocalePanelMounted(false);
        }
      });

      return () => localePanelProgress.stopAnimation();
    }

    return undefined;
  }, [localePanelMounted, localePanelOpen, localePanelProgress]);

  const desktopLocalePopoverMotion = {
    opacity: localePanelProgress,
    transform: [
      {
        translateY: localePanelProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
      {
        scale: localePanelProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };
  const desktopLocaleIconMotion = {
    transform: [
      {
        scale: localePanelProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  return (
    <View style={styles.desktopLocaleRoot}>
      <MotionPressable
        accessibilityLabel="Language and region"
        accessibilityRole="button"
        accessibilityState={{ expanded: localePanelOpen }}
        onPress={() => {
          if (!localePanelOpen) {
            setLocalePanelMounted(true);
          }
          setLocalePanelOpen((open) => !open);
        }}
        pressScale={motion.scale.subtlePress}
        style={[
          styles.desktopLocaleButton,
          localePanelOpen ? styles.desktopLocaleButtonOpen : null,
        ]}
      >
        <Animated.View style={desktopLocaleIconMotion}>
          <Globe color={localePanelOpen ? "#00CC99" : "#1F2937"} size={22} weight="regular" />
        </Animated.View>
      </MotionPressable>
      {localePanelMounted ? (
        <Animated.View
          {...({ role: "dialog" } as const)}
          accessibilityLabel={webLocaleRegionPanel.ariaLabel}
          style={[styles.desktopLocalePopover, desktopLocalePopoverMotion]}
        >
          <LocaleSectionTitle>{webLocaleRegionPanel.sections.language}</LocaleSectionTitle>
          <View style={styles.desktopLocaleOptionStack}>
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
          <View style={styles.desktopLocaleDivider} />
          <LocaleSectionTitle>{webLocaleRegionPanel.sections.region}</LocaleSectionTitle>
          <ScrollView
            contentContainerStyle={styles.desktopLocaleRegionList}
            showsVerticalScrollIndicator
            style={styles.desktopLocaleRegionScroller}
          >
            {webLocaleRegionPanel.regions.map((region) => (
              <LocaleOption
                flag={region.flag}
                key={region.code}
                label={region.label}
                selected={selectedRegion === region.code}
                onPress={() => setSelectedRegion(region.code)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

function LocaleSectionTitle({ children }: { children: string }) {
  const styles = useThemedStyles(createLocaleRegionControlStyles);
  return <Text style={styles.desktopLocaleSectionTitle}>{children}</Text>;
}

function LocaleOption({
  flag,
  label,
  onPress,
  selected,
}: {
  flag: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const styles = useThemedStyles(createLocaleRegionControlStyles);
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      pressScale={motion.scale.subtlePress}
      style={[styles.desktopLocaleOption, selected ? styles.desktopLocaleOptionSelected : null]}
    >
      <Text style={styles.desktopLocaleOptionFlag}>{flag}</Text>
      <Text
        style={[
          styles.desktopLocaleOptionLabel,
          selected ? styles.desktopLocaleOptionLabelSelected : null,
        ]}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}

function createLocaleRegionControlStyles(colors: ThemeColors) {
  return StyleSheet.create({
  desktopLocaleButton: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "rgba(255,255,255,0.9)", colors.card),
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  desktopLocaleButtonOpen: {
    backgroundColor: pickThemed(colors, "#E8FAF5", colors.primarySoft),
    borderColor: "rgba(0, 204, 153, 0.4)",
  },
  desktopLocaleRoot: {
    position: "relative",
    zIndex: 90,
  },
  desktopLocalePopover: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: 16,
    position: "absolute",
    right: 0,
    top: 52,
    width: 288,
    zIndex: 100,
  },
  desktopLocaleSectionTitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  desktopLocaleOptionStack: {
    gap: 2,
    marginTop: 8,
  },
  desktopLocaleOption: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  desktopLocaleOptionSelected: {
    backgroundColor: "#E8FAF5",
  },
  desktopLocaleOptionFlag: {
    fontSize: 18,
    lineHeight: 20,
  },
  desktopLocaleOptionLabel: {
    color: "#374151",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  desktopLocaleOptionLabelSelected: {
    color: "#00CC99",
  },
  desktopLocaleDivider: {
    backgroundColor: colors.fieldMuted,
    height: 1,
    marginBottom: 16,
    marginTop: 16,
  },
  desktopLocaleRegionScroller: {
    height: 192,
    marginTop: 8,
    overflow: "hidden",
  },
  desktopLocaleRegionList: {
    gap: 2,
    paddingRight: 4,
  },
});
}

