import { Image } from "expo-image";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Link } from "expo-router";

import favoriteHeroBagImage from "../../assets/favorite-hero-bag.png";
import favoriteHeroLogoImage from "../../assets/favorite-hero-logo.png";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout, webFavoriteBrandsPage } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

/**
 * Favorite Brands hero. Redesigned 2026-07-11 (founder feedback): the old
 * stacked hero — 60pt logo + title + 3-line paragraph + full pill + 200pt
 * illustration — filled more than a phone screen before the first brand card
 * appeared. Mobile is now a COMPACT one-row banner (copy left, small
 * illustration right, ~⅓ the height); desktop keeps the generous web-parity
 * layout with the logo and large illustration.
 */
export function FavoriteBrandsHero() {
  const styles = useThemedStyles(createFavoriteBrandsHeroStyles);
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={[styles.heroCard, isDesktop ? styles.heroCardDesktop : null]}>
      <View style={[styles.heroTextColumn, isDesktop ? styles.heroTextColumnDesktop : null]}>
        {isDesktop ? (
          <Image
            alt={webFavoriteBrandsPage.hero.logoAlt}
            source={favoriteHeroLogoImage}
            style={styles.heroLogo}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.heroTitle, isDesktop ? styles.heroTitleDesktop : null]}
        >
          {tc(webFavoriteBrandsPage.hero.title)}
        </Text>
        <Text
          numberOfLines={isDesktop ? undefined : 2}
          style={[styles.heroDescription, isDesktop ? styles.heroDescriptionDesktop : null]}
        >
          {tc(webFavoriteBrandsPage.hero.description)}
        </Text>
        <Link asChild href="/shops">
          {/* Single style object (not an array): expo-router's asChild Slot merges the child's
              style and breaks on an array. */}
          <MotionPressable
            accessibilityRole="link"
            pressScale={0.98}
            style={isDesktop ? styles.heroButtonDesktop : styles.heroButton}
          >
            <Text
              style={[styles.heroButtonText, isDesktop ? styles.heroButtonTextDesktop : null]}
            >
              {tc(webFavoriteBrandsPage.hero.actionLabel)}
            </Text>
          </MotionPressable>
        </Link>
      </View>
      <Image
        alt={tc(webFavoriteBrandsPage.hero.illustrationAlt)}
        resizeMode="contain"
        source={favoriteHeroBagImage}
        style={[styles.heroBag, isDesktop ? styles.heroBagDesktop : null]}
      />
    </View>
  );
}

function createFavoriteBrandsHeroStyles(colors: ThemeColors) {
  return StyleSheet.create({
    heroCard: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, "#F2FBF8", colors.fieldMuted),
      borderColor: pickThemed(colors, "#D8F0E8", colors.border),
      borderRadius: radii.lg,
      borderWidth: 1,
      boxShadow: "0 4px 16px rgba(16, 53, 34, 0.10)",
      flexDirection: "row",
      gap: spacing.md,
      overflow: "hidden",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    heroCardDesktop: {
      gap: 40,
      justifyContent: "space-between",
      paddingBottom: 40,
      paddingHorizontal: 40,
      paddingTop: 40,
    },
    heroTextColumn: {
      alignItems: "flex-start",
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
    },
    heroTextColumnDesktop: {
      gap: 12,
    },
    heroLogo: {
      height: 60,
      width: 60,
    },
    heroTitle: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
    },
    heroTitleDesktop: {
      fontSize: 24,
      lineHeight: 31,
    },
    heroDescription: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 13,
      lineHeight: 18,
    },
    heroDescriptionDesktop: {
      fontSize: 15,
      lineHeight: 24,
      maxWidth: 400,
    },
    heroButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: radii.chip,
      justifyContent: "center",
      marginTop: spacing.xs,
      minHeight: 36,
      paddingHorizontal: spacing.lg,
    },
    heroButtonDesktop: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: radii.chip,
      justifyContent: "center",
      marginTop: 8,
      minHeight: 48,
      minWidth: 154,
      paddingHorizontal: 28,
    },
    heroButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
    },
    heroButtonTextDesktop: {
      fontSize: 18,
      lineHeight: 24,
    },
    heroBag: {
      height: 96,
      width: 100,
    },
    heroBagDesktop: {
      height: 200,
      width: 240,
    },
  });
}
