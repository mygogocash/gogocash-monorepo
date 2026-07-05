import { Image } from "expo-image";
import { memo, useState } from "react";
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
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getTopBrandHref, mobileShellLayout } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { Heart as HeartIcon } from "@mobile/theme/icons";
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
      readonly onPress?: () => void;
      readonly testID?: string;
    });

function brandHref(brand: string) {
  return getTopBrandHref(brand);
}

function brandInitials(brand: string): string {
  const parts = brand
    .replace(/&/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "GO";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function resolveCompactLogoSource(
  props: Extract<BrandCardProps, { size: "S" }>,
  logoFailed: boolean
): ImageSourcePropType | null {
  if (logoFailed) {
    return null;
  }

  if (props.logoUri) {
    return { uri: props.logoUri };
  }

  if (props.logoAsset) {
    return brandLogoAssets[props.logoAsset] ?? null;
  }

  return null;
}

export const BrandCard = memo(function BrandCard(props: BrandCardProps) {
  const styles = useThemedStyles(createBrandCardStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { brand, cashback, href, tint } = props;
  const wide = props.size === "L" && props.cardWidth >= 200;
  const { isFavorite: isBrandFavorite, toggleFavorite } = useFavoriteBrands();
  const favoriteOfferId =
    props.size === "L"
      ? resolveFavoriteOfferId({
          id: props.id,
          href: href ?? brandHref(brand),
          brand,
        })
      : "";
  const isFavorite = props.size === "L" ? isBrandFavorite(favoriteOfferId) : false;
  const [logoFailed, setLogoFailed] = useState(false);
  const onToggleFavorite = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    event.preventDefault?.();
    if (props.size === "L") {
      toggleFavorite(favoriteOfferId);
    }
  };
  const onLogoError = () => {
    setLogoFailed(true);
  };
  const compactLogoSource =
    props.size === "S" ? resolveCompactLogoSource(props, logoFailed) : null;
  const hasCompactLogoSource =
    props.size === "S" && Boolean(props.logoUri || props.logoAsset) && !logoFailed;
  const brandVisualBackground =
    props.size === "L"
      ? props.logoUri && !logoFailed
        ? colors.card
        : tint
      : hasCompactLogoSource
        ? colors.card
        : tint;

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
          <View
            style={[
              styles.brandVisual,
              { backgroundColor: brandVisualBackground },
            ]}
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
            {props.logoUri && !logoFailed ? (
              <Image
                accessibilityLabel={`${brand} logo`}
                cachePolicy="memory-disk"
                contentFit="contain"
                onError={onLogoError}
                recyclingKey={props.logoUri ?? `${brand}-logo`}
                source={{ uri: props.logoUri }}
                style={styles.brandLogoImage}
              />
            ) : (
              <Text numberOfLines={2} style={styles.compactBrandLogoFallback}>
                {brandInitials(brand)}
              </Text>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.compactBrandVisual,
              {
                backgroundColor: brandVisualBackground,
                height: props.logoVisualHeight,
              },
            ]}
          >
            {props.logoFallbackText ? (
              <Text numberOfLines={2} style={styles.compactBrandLogoFallback}>
                {props.logoFallbackText}
              </Text>
            ) : compactLogoSource ? (
              <Image
                accessibilityLabel={`${brand} logo`}
                cachePolicy="memory-disk"
                contentFit="contain"
                onError={onLogoError}
                recyclingKey={
                  props.logoUri ?? props.logoAsset ?? props.logoFallbackText ?? `${brand}-logo`
                }
                source={compactLogoSource}
                style={styles.compactBrandLogoImage}
              />
            ) : (
              <Text numberOfLines={2} style={styles.compactBrandLogoFallback}>
                {brandInitials(brand)}
              </Text>
            )}
          </View>
        )}
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
      alignItems: "center",
      aspectRatio: 1,
      borderRadius: radii.sm,
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
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
    brandLogoImage: {
      ...StyleSheet.absoluteFillObject,
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
      alignItems: "center",
      borderRadius: radii.sm,
      height: mobileShellLayout.compactBrandLogoVisualHeight,
      justifyContent: "center",
      overflow: "hidden",
      width: "100%",
    },
    compactBrandLogoImage: {
      ...StyleSheet.absoluteFillObject,
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
