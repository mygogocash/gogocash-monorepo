import { Text, View } from "react-native";
import { CategoryGlyph } from "@mobile/components/CategoryGlyph";
import { webProductDiscovery } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

export function ProductDiscoverySidebar({
  activeCategory,
  categoryIconImages,
  categoryIconKeys,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  categoryIconImages?: Readonly<Record<string, string>>;
  categoryIconKeys?: Readonly<Record<string, string>>;
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
                <CategoryGlyph
                  category={category.label}
                  color={active ? colors.white : colors.accent}
                  iconKey={categoryIconKeys?.[category.label]}
                  imageUrl={categoryIconImages?.[category.label]}
                  size={18}
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
