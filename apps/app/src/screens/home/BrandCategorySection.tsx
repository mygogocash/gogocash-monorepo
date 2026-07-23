import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CategoryGlyph } from "@mobile/components/CategoryGlyph";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import type { ThemeColors } from "@mobile/theme/colorPalettes";

import type { BrandCategoryTile } from "./brandCategoryTiles";
import { useHomeScreenStyles } from "./homeScreenHooks";

/** Founder spec: 4-up on one desktop row, 2x2 on mobile. */
export function getBrandCategoryColumns(isDesktop: boolean): number {
  return isDesktop ? 4 : 2;
}

/**
 * Fixed-width cards wrapped unpredictably, because the width they were sized from
 * was never the row they actually landed in. Chunking into explicit rows and
 * letting each card `flex: 1` means the grid fits whatever width it is given —
 * no measurement, and no wrong first paint.
 */
export function chunkBrandCategoryRows<T>(tiles: readonly T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < tiles.length; index += columns) {
    rows.push(tiles.slice(index, index + columns));
  }
  return rows;
}

export function BrandCategorySection({
  isDesktop,
  tiles,
}: {
  isDesktop: boolean;
  tiles: readonly BrandCategoryTile[];
}) {
  const homeStyles = useHomeScreenStyles();
  const styles = useThemedStyles(createBrandCategoryStyles);
  const { colors } = useTheme();
  const tc = useCopy();

  if (tiles.length === 0) {
    return null;
  }

  const columns = getBrandCategoryColumns(isDesktop);
  const gap = isDesktop ? spacing.md : spacing.sm;
  const rows = chunkBrandCategoryRows(tiles, columns);

  return (
    <View style={[homeStyles.section, { gap }]} testID="home-brand-categories">
      {rows.map((row, rowIndex) => (
        <View key={`brand-category-row-${rowIndex}`} style={[styles.row, { gap }]}>
          {row.map((tile) => (
            <Link asChild href={tile.href as never} key={tile.id}>
              <MotionPressable
                accessibilityLabel={tile.label}
                accessibilityRole="link"
                pressScale={motion.scale.subtlePress}
                style={styles.card}
                testID={`brand-category-card-${tile.id}`}
              >
                <CategoryGlyph category={tile.label} color={colors.primary} size={22} />
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {tc(tile.label)}
                </Text>
              </MotionPressable>
            </Link>
          ))}
          {/* Keeps a short last row's cards the same width as a full row's. */}
          {Array.from({ length: columns - row.length }, (_, index) => (
            <View key={`brand-category-spacer-${rowIndex}-${index}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}

function createBrandCategoryStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      width: "100%",
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      padding: spacing.md,
      boxShadow: shadows.cardCss,
    },
    spacer: {
      flex: 1,
      minWidth: 0,
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
