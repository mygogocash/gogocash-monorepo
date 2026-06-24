import { Link } from "expo-router";
import { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  ArrowRight as ArrowRightIcon,
  Heart as HeartIcon,
} from "@mobile/theme/icons";
import homeBannerImage from "../../../assets/home-banner.png";
import { webProductDiscovery, type WebProductDiscoveryProduct } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { productImageAssets } from "./directoryAssets";

export const ProductDiscoveryCard = memo(function ProductDiscoveryCard({
  cardWidth,
  onOpenTerms,
  product,
}: {
  cardWidth: number;
  onOpenTerms: () => void;
  product: WebProductDiscoveryProduct;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const imageSource = productImageAssets[product.imageAsset] ?? homeBannerImage;

  return (
    <View style={[styles.productDiscoveryCard, { width: cardWidth }]}>
      <View style={[styles.productDiscoveryImageFrame, { backgroundColor: product.tint }]}>
        <Image
          alt={`${product.title} product image`}
          accessibilityLabel={`${product.title} product image`}
          resizeMode="cover"
          source={imageSource}
          style={styles.productDiscoveryImage}
        />
        {product.discountPercent > 0 ? (
          <View style={styles.productDiscoveryDiscountBadge}>
            <Text style={styles.productDiscoveryDiscountText}>-{product.discountPercent}%</Text>
          </View>
        ) : null}
        <View style={styles.productDiscoveryFavoriteButton}>
          <HeartIcon
            color={colors.primaryDark}
            size={16}
            strokeWidth={typography.iconStrokeWidth}
          />
        </View>
      </View>

      <View style={styles.productDiscoveryCardBody}>
        <Text numberOfLines={2} style={styles.productDiscoveryCardTitle}>
          {product.title}
        </Text>
        <View style={styles.productDiscoveryPriceRow}>
          <Text numberOfLines={1} style={styles.productDiscoveryPriceHint}>
            {tc(webProductDiscovery.priceHint)}
          </Text>
          <View style={styles.productDiscoveryPriceStack}>
            <Text numberOfLines={1} style={styles.productDiscoveryOriginalPrice}>
              {product.originalPriceLabel}
            </Text>
            <Text numberOfLines={1} style={styles.productDiscoveryPrice}>
              {product.priceLabel}
            </Text>
          </View>
        </View>
        <Link asChild href={product.href as never}>
          <MotionPressable
            accessibilityRole="link"
            pressScale={motion.scale.subtlePress}
            style={StyleSheet.flatten([styles.productDiscoveryShopNowButton])}
          >
            <Text style={styles.productDiscoveryShopNowText}>{tc(product.shopNowLabel)}</Text>
            <ArrowRightIcon
              color={colors.white}
              size={16}
              strokeWidth={typography.iconStrokeWidth}
            />
          </MotionPressable>
        </Link>
        <MotionPressable
          accessibilityRole="button"
          onPress={onOpenTerms}
          pressScale={motion.scale.subtlePress}
          style={styles.productDiscoveryTermsButton}
        >
          <Text style={styles.productDiscoveryTermsText}>{tc(webProductDiscovery.termsLabel)}</Text>
        </MotionPressable>
      </View>
    </View>
  );
});
