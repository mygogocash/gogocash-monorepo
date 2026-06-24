import { Text, View } from "react-native";
import { getCategoryIcon } from "@mobile/theme/categoryIcons";
import { webProductDiscovery } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

export function ProductDiscoverySidebar({
  activeCategory,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  width: number;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={[styles.productDiscoverySidebar, { width }]}>
      <Text numberOfLines={1} style={styles.productDiscoverySidebarTitle}>
        {tc("All Categories")}
      </Text>
      <View style={styles.productDiscoverySidebarDivider} />
      <View style={styles.productDiscoverySidebarList}>
        {webProductDiscovery.categories.map((category) => {
          const active = activeCategory === category.value;
          const CategoryIcon = getCategoryIcon(category.label);

          return (
            <MotionPressable
              accessibilityRole="button"
              key={category.value || "all"}
              onPress={() => onSelectCategory(category.value)}
              pressScale={motion.scale.subtlePress}
              style={[
                styles.productDiscoverySidebarButton,
                active ? styles.productDiscoverySidebarButtonActive : null,
              ]}
            >
              <View style={styles.productDiscoverySidebarIconCell}>
                <CategoryIcon
                  color={active ? colors.white : colors.accent}
                  size={18}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.productDiscoverySidebarText,
                  active ? styles.productDiscoverySidebarTextActive : null,
                ]}
              >
                {tc(category.label)}
              </Text>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}
