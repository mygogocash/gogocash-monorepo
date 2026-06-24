import { ScrollView, Text, View } from "react-native";
import {
  webProductDiscovery,
  type WebProductDiscoveryCashbackMin,
} from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

export function ProductDiscoveryMobileFilters({
  activeCashbackMin,
  activeCategory,
  onSelectCashback,
  onSelectCategory,
}: {
  activeCashbackMin: WebProductDiscoveryCashbackMin;
  activeCategory: string;
  onSelectCashback: (cashback: WebProductDiscoveryCashbackMin) => void;
  onSelectCategory: (category: string) => void;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.productDiscoveryMobileFilters}>
      <ScrollView
        contentContainerStyle={styles.productDiscoveryMobileFilterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {webProductDiscovery.categories.map((category) => (
          <MotionPressable
            accessibilityRole="button"
            key={category.value || "all"}
            onPress={() => onSelectCategory(category.value)}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.productDiscoveryPill,
              activeCategory === category.value ? styles.productDiscoveryPillActive : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.productDiscoveryPillText,
                activeCategory === category.value ? styles.productDiscoveryPillTextActive : null,
              ]}
            >
              {tc(category.label)}
            </Text>
          </MotionPressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.productDiscoveryMobileFilterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {webProductDiscovery.cashbackFilters.map((filter) => (
          <MotionPressable
            accessibilityRole="button"
            key={filter.value}
            onPress={() => onSelectCashback(filter.value as WebProductDiscoveryCashbackMin)}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.productDiscoveryPill,
              activeCashbackMin === filter.value ? styles.productDiscoveryCashbackPillActive : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.productDiscoveryPillText,
                activeCashbackMin === filter.value
                  ? styles.productDiscoveryCashbackPillTextActive
                  : null,
              ]}
            >
              {filter.label}
            </Text>
          </MotionPressable>
        ))}
      </ScrollView>
    </View>
  );
}
