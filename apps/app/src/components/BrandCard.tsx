import { memo } from "react";
import { useFavoriteBrands } from "@mobile/account/FavoriteBrandsProvider";
import { resolveFavoriteOfferId } from "@mobile/account/resolveFavoriteOfferId";
import { Link } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
} from "react-native";

import lazadaLogo from "../../assets/partner-lazada.png";
import sheinLogo from "../../assets/partner-shein.png";
import shopeeLogo from "../../assets/partner-shopee.png";
import type { TopBrandCard } from "@mobile/account/topBrandResource";
import { BrandLogoTile, brandInitials } from "@mobile/components/BrandLogoTile";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getTopBrandHref, mobileShellLayout } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { Heart as HeartIcon, ShoppingCart as ShoppingCartIcon } from "@mobile/theme/icons";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const brandLogoAssets: Record<string, ImageSourcePropType> = {
  lazada: lazadaLogo,
  shein: sheinLogo,
  shopee: shopeeLogo,
};

export type CompactBrandCardContent = {
  readonly brand: string;
  readonly cashback: string;
  readonly href?: string;
  readonly logoAsset?: keyof typeof brandLogoAssets;
  readonly logoFallbackText?: string;
  readonly logoUri?: string;
  readonly tint: string;
};

export type BrandCardProps =
  | (TopBrandCard & {
      readonly size: "L";
      readonly cardHeight: number;
      readonly cardWidth: number;
      readonly accessibilityLabel?: string;
      readonly onPress?: () => void;
      readonly testID?: string;
    })
  | (CompactBrandCardContent & {
      readonly size: "S";
      readonly cardHeight: number;
      readonly cardWidth: number;
      readonly logoVisualHeight: number;
      readonly accessibilityLabel?: string;
      /** Category chip between the tile and the name (favorites grids). */
      readonly categoryLabel?: string;
      /** Stable offer id for the favorite heart (falls back to href/brand). */
      readonly id?: string;
      readonly onPress?: () => void;
      /** Render the same favorite heart the L card carries. */
      readonly showFavoriteHeart?: boolean;
      readonly testID?: string;
    });

function brandHref(brand: string) {
  return getTopBrandHref(brand);
}

function resolveCompactLogoSource(
  props: Extract<BrandCardProps, { size: "S" }>
): ImageSourcePropType | null {
  if (props.logoUri) {
    return { uri: props.logoUri };
  }

  if (props.logoAsset) {
    return brandLogoAssets[props.logoAsset] ?? null;
  }

  return null;
}

/** Extra card height when the compact category chip renders (chip + gap). */
export const BRAND_CARD_CATEGORY_CHIP_HEIGHT = 33;

export const BrandCard = memo(function BrandCard(props: BrandCardProps) {
  const styles = useThemedStyles(createBrandCardStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { brand, cashback, href, tint } = props;
  const wide = props.size === "L" && props.cardWidth >= 200;
  const { isFavorite: isBrandFavorite, toggleFavorite } = useFavoriteBrands();
  const wantsFavoriteHeart =
    props.size === "L" || (props.size === "S" && props.showFavoriteHeart === true);
  const favoriteOfferId = wantsFavoriteHeart
    ? resolveFavoriteOfferId({
        id: props.id,
        href: href ?? brandHref(brand),
        brand,
      })
    : "";
  const isFavorite = wantsFavoriteHeart ? isBrandFavorite(favoriteOfferId) : false;
  const logoSourceKey =
    props.size === "L"
      ? props.logoUri
      : props.logoUri ?? props.logoAsset ?? props.logoFallbackText;
  const onToggleFavorite = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    event.preventDefault?.();
    if (wantsFavoriteHeart) {
      toggleFavorite(favoriteOfferId);
    }
  };
  const compactLogoSource =
    props.size === "S" ? resolveCompactLogoSource(props) : null;

  const card = (
    <MotionPressable
      accessibilityLabel={props.accessibilityLabel ?? brand}
      accessibilityRole="button"
      onPress={props.onPress}
      style={StyleSheet.flatten([
        props.size === "L" ? styles.brandCard : styles.compactBrandCard,
        { height: props.cardHeight, width: props.cardWidth },
      ])}
      testID={props.testID}
    >
        {props.size === "L" ? (
          <BrandLogoTile
            brand={brand}
            containerStyle={styles.brandVisual}
            source={props.logoUri ? { uri: props.logoUri } : null}
            sourceKey={logoSourceKey}
            tint={tint}
          >
            {props.showGrabCoupon ? (
              <View style={styles.couponChip}>
                <Text style={styles.couponIcon}>🧧</Text>
                <Text numberOfLines={1} style={styles.couponText}>
                  {props.label}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityLabel={
                isFavorite
                  ? `${tc("Remove from saved brands")}: ${brand}`
                  : `${tc("Save brand")}: ${brand}`
              }
              accessibilityRole="button"
              accessibilityState={{ selected: isFavorite }}
              hitSlop={8}
              onPress={onToggleFavorite}
              style={styles.heartCircle}
            >
              <HeartIcon
                color={isFavorite ? colors.primary : colors.primaryDark}
                fill={isFavorite ? colors.primary : undefined}
                size={21}
                strokeWidth={isFavorite ? 0 : 2}
              />
            </Pressable>
          </BrandLogoTile>
        ) : (
          <BrandLogoTile
            brand={brand}
            containerStyle={[styles.compactBrandVisual, { height: props.logoVisualHeight }]}
            fallbackText={props.logoFallbackText ?? brandInitials(brand)}
            fallbackTextStyle={styles.compactBrandLogoFallback}
            imageSquare={props.logoVisualHeight}
            source={props.logoFallbackText ? null : compactLogoSource}
            sourceKey={logoSourceKey}
            tint={tint}
          >
            {props.showFavoriteHeart ? (
              <Pressable
                accessibilityLabel={
                  isFavorite
                    ? `${tc("Remove from saved brands")}: ${brand}`
                    : `${tc("Save brand")}: ${brand}`
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isFavorite }}
                hitSlop={8}
                onPress={onToggleFavorite}
                style={styles.heartCircle}
              >
                <HeartIcon
                  color={isFavorite ? colors.primary : colors.primaryDark}
                  fill={isFavorite ? colors.primary : undefined}
                  size={18}
                  strokeWidth={isFavorite ? 0 : 2}
                />
              </Pressable>
            ) : null}
          </BrandLogoTile>
        )}
        {props.size === "S" && props.categoryLabel ? (
          <View style={styles.compactCategoryChip}>
            <ShoppingCartIcon
              color={colors.primaryDark}
              size={13}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text numberOfLines={1} style={styles.compactCategoryText}>
              {tc(props.categoryLabel)}
            </Text>
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          style={props.size === "L" ? styles.lShopCardTitle : styles.compactBrandName}
        >
          {brand}
        </Text>
        <View style={props.size === "L" ? styles.brandCashbackRow : styles.compactCashbackRow}>
          <Text
            numberOfLines={1}
            style={props.size === "L" ? styles.brandCashbackCaption : styles.compactCashbackCaption}
          >
            {tc("Cashback upto")}
          </Text>
          <Text
            style={
              props.size === "L"
                ? [styles.brandCashback, wide ? styles.brandCashbackLarge : null]
                : styles.compactCashbackValue
            }
          >
            {cashback}
          </Text>
        </View>
      </MotionPressable>
  );

  if (props.onPress) {
    return card;
  }

  return (
    <Link asChild href={(href ?? brandHref(brand)) as never}>
      {card}
    </Link>
  );
});

function createBrandCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    brandCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      overflow: "hidden",
      padding: 8,
      boxShadow: shadows.cardCss,
    },
    brandVisual: {
      aspectRatio: 1,
    },
    couponChip: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, "rgba(255,255,255,0.92)", colors.card),
      borderColor: colors.border,
      borderRadius: radii.chip,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      height: 20,
      left: 6,
      maxWidth: "70%",
      paddingHorizontal: 6,
      position: "absolute",
      top: 6,
      zIndex: 2,
    },
    couponIcon: {
      fontSize: 12,
      lineHeight: 14,
    },
    couponText: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 10,
      fontWeight: typography.bodyWeight,
    },
    heartCircle: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, "rgba(255,255,255,0.92)", colors.card),
      borderRadius: radii.chip,
      bottom: 8,
      height: 28,
      justifyContent: "center",
      position: "absolute",
      right: 8,
      width: 28,
      zIndex: 2,
    },
    lShopCardTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: typography.labelWeight,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    brandCashbackRow: {
      alignItems: "baseline",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    brandCashbackCaption: {
      color: colors.muted,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 11,
      fontWeight: typography.bodyWeight,
    },
    brandCashback: {
      color: colors.primaryDark,
      flexShrink: 0,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 18,
    },
    brandCashbackLarge: {
      fontSize: 18,
      lineHeight: 18,
    },
    compactBrandCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 4,
      overflow: "hidden",
      padding: 8,
      boxShadow: shadows.cardCss,
    },
    compactBrandVisual: {
      height: mobileShellLayout.compactBrandLogoVisualHeight,
    },
    compactCategoryChip: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.primarySoft,
      borderColor: "rgba(0, 170, 128, 0.22)",
      borderRadius: radii.chip,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      marginTop: 6,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    compactCategoryText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 15,
    },
    compactBrandLogoFallback: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: typography.bodyWeight,
      lineHeight: 24,
      width: "72%",
    },
    compactBrandName: {
      color: colors.ink,
      flexShrink: 0,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.labelWeight,
      lineHeight: 17.5,
      marginTop: 2,
    },
    compactCashbackRow: {
      alignItems: "baseline",
      flexDirection: "row",
      flexShrink: 0,
      gap: spacing.xs,
      justifyContent: "space-between",
    },
    compactCashbackCaption: {
      color: colors.muted,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 10,
      fontWeight: typography.bodyWeight,
      lineHeight: 10,
    },
    compactCashbackValue: {
      color: colors.primaryDark,
      flexShrink: 0,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 16,
    },
  });
}
