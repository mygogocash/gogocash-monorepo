import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { BrandLogoTile } from "@mobile/components/BrandLogoTile";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import type { ThemeColors } from "@mobile/theme/colorPalettes";

import type { BrandCategoryTile } from "./brandCategoryTiles";
import { useHomeScreenStyles } from "./homeScreenHooks";

/** Founder spec: 4-up on one desktop row, 2x2 on mobile. */
export function getBrandCategoryColumns(isDesktop: boolean): number {
  return isDesktop ? 4 : 2;
}

export function BrandCategorySection({
  contentWidth,
  isDesktop,
  tiles,
}: {
  contentWidth: number;
  isDesktop: boolean;
  tiles: readonly BrandCategoryTile[];
}) {
  const homeStyles = useHomeScreenStyles();
  const styles = useThemedStyles(createBrandCategoryStyles);
  const tc = useCopy();

  if (tiles.length === 0) {
    return null;
  }

  const columns = getBrandCategoryColumns(isDesktop);
  const gap = isDesktop ? spacing.md : spacing.sm;
  const cardWidth = Math.max(0, (contentWidth - gap * (columns - 1)) / columns);

  return (
    <View style={homeStyles.section} testID="home-brand-categories">
      <View style={[styles.grid, { gap }]}>
        {tiles.map((tile) => (
          <Link asChild href={tile.href as never} key={tile.id}>
              <MotionPressable
                accessibilityLabel={tile.label}
                accessibilityRole="link"
                pressScale={motion.scale.subtlePress}
                style={StyleSheet.flatten([styles.card, { width: cardWidth }])}
                testID={`brand-category-card-${tile.id}`}
              >
                <View style={styles.logoRow}>
                  {tile.logos.map((logo, index) => (
                    <View key={`${tile.id}-logo-${index}`} style={styles.logoCell}>
                      {logo ? (
                        <BrandLogoTile
                          brand={tile.label}
                          containerStyle={styles.logoTile}
                          source={logo.logoUri ? { uri: logo.logoUri } : null}
                          sourceKey={logo.logoUri}
                          tint={logo.tint}
                        />
                      ) : (
                        <View style={styles.logoBlank} />
                      )}
                    </View>
                  ))}
                </View>

                <Text numberOfLines={1} style={styles.cardTitle}>
                  {tc(tile.label)}
                </Text>
              </MotionPressable>
            </Link>
        ))}
      </View>
    </View>
  );
}

function createBrandCategoryStyles(colors: ThemeColors) {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      width: "100%",
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      overflow: "hidden",
      padding: spacing.sm,
      boxShadow: shadows.cardCss,
    },
    logoRow: {
      flexDirection: "row",
      gap: 5,
    },
    logoCell: {
      flex: 1,
    },
    logoBlank: {
      aspectRatio: 1,
      width: "100%",
    },
    logoTile: {
      aspectRatio: 1,
      borderRadius: 7,
      overflow: "hidden",
      width: "100%",
    },
    cardTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: typography.labelWeight,
      lineHeight: 24,
      marginTop: 8,
    },
  });
}
