import { Image } from "expo-image";
import { Link } from "expo-router";
import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Heart as HeartIcon } from "@mobile/theme/icons";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { directoryBrandInitials } from "./directoryInitials";
import { type ShopDirectoryStore } from "./discoveryTypes";
import { getShopTypeLabel } from "./getShopTypeLabel";

export const ShopDirectoryStoreCard = memo(function ShopDirectoryStoreCard({
  cardWidth,
  store,
}: {
  cardWidth: number;
  store: ShopDirectoryStore;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [store.logoUri]);
  const showLogo = Boolean(store.logoUri) && !logoFailed;
  const logoTileBackground = showLogo ? colors.card : store.tint;

  return (
    <Link asChild href={store.href as never}>
      <MotionPressable
        accessibilityLabel={`${store.brand} ${store.cashback} cashback`}
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([styles.shopDirectoryStoreCard, { width: cardWidth }])}
      >
        <View style={[styles.shopDirectoryLogoTile, { backgroundColor: logoTileBackground }]}>
          {showLogo ? (
            <Image
              accessibilityLabel={`${store.brand} logo`}
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={() => setLogoFailed(true)}
              recyclingKey={store.logoUri}
              source={{ uri: store.logoUri }}
              style={styles.shopDirectoryLogoImage}
            />
          ) : (
            <Text numberOfLines={1} style={styles.shopDirectoryLogoFallback}>
              {directoryBrandInitials(store.brand)}
            </Text>
          )}
          {store.showGrabCoupon ? (
            <View style={styles.shopDirectoryCouponBadge}>
              <Text style={styles.shopDirectoryCouponIcon}>🧧</Text>
              <Text numberOfLines={1} style={styles.shopDirectoryCouponText}>
                {tc(store.label)}
              </Text>
            </View>
          ) : null}
          <View style={styles.shopDirectoryFavoriteButton}>
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
            {tc(store.category)} · {tc(getShopTypeLabel(store.shopType))}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
});
