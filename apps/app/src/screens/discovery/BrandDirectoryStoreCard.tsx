import { Link } from "expo-router";
import { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Heart as HeartIcon } from "@mobile/theme/icons";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { type BrandDirectoryStore } from "./discoveryTypes";

export const BrandDirectoryStoreCard = memo(function BrandDirectoryStoreCard({
  cardWidth,
  store,
}: {
  cardWidth: number;
  store: BrandDirectoryStore;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <Link asChild href={store.href as never}>
      <MotionPressable
        accessibilityLabel={`${store.brand} ${store.cashback} cashback`}
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([styles.shopDirectoryStoreCard, { width: cardWidth }])}
        testID={`brand-directory-card-${store.id}`}
      >
        <View style={[styles.shopDirectoryLogoTile, { backgroundColor: store.tint }]}>
          <Image
            alt={`${store.brand} logo`}
            accessibilityLabel={`${store.brand} logo`}
            resizeMode="contain"
            source={{ uri: store.logoUri }}
            style={styles.shopDirectoryLogoImage}
          />
          {store.showGrabCoupon ? (
            <View style={styles.shopDirectoryCouponBadge}>
              <Text style={styles.shopDirectoryCouponIcon}>🧧</Text>
              <Text numberOfLines={1} style={styles.shopDirectoryCouponText}>
                {tc(store.label)}
              </Text>
            </View>
          ) : null}
          <View accessibilityLabel={tc("Add to favorites")} style={styles.shopDirectoryFavoriteButton}>
            <HeartIcon
              color={colors.primaryDark}
              size={16}
              strokeWidth={typography.iconStrokeWidth}
            />
          </View>
        </View>
        <View style={styles.shopDirectoryStoreMeta}>
          <Text numberOfLines={2} style={styles.shopDirectoryStoreName}>
            {store.brand}
          </Text>
          <View style={styles.shopDirectoryCashbackRow}>
            <Text numberOfLines={1} style={styles.shopDirectoryCashbackCaption}>
              {tc("Cashback upto")}
            </Text>
            <Text numberOfLines={1} style={styles.shopDirectoryCashbackValue}>
              {store.cashback}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.shopDirectoryStoreCategory}>
            {tc(store.category)}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
});
