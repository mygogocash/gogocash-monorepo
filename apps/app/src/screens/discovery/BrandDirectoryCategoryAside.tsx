import { ScrollView, Text, View } from "react-native";
import { getCategoryIcon } from "@mobile/theme/categoryIcons";
import { webBrandDirectory } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

export function BrandDirectoryCategoryAside({
  activeCategory,
  categories = webBrandDirectory.categories,
  isDesktop,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  categories?: readonly string[];
  isDesktop: boolean;
  onSelectCategory: (category: string) => void;
  width: number;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View
      style={[
        styles.shopDirectoryCategoryAside,
        isDesktop ? styles.shopDirectoryCategoryAsideDesktop : null,
        { width },
      ]}
    >
      <Text
        style={[
          styles.shopDirectoryCategoryTitle,
          isDesktop ? styles.shopDirectoryCategoryTitleDesktop : null,
        ]}
      >
        {tc(webBrandDirectory.categoryHeading)}
      </Text>
      {isDesktop ? <View style={styles.shopDirectoryCategoryDivider} /> : null}
      <ScrollView
        contentContainerStyle={[
          styles.shopDirectoryCategoryList,
          isDesktop ? styles.shopDirectoryCategoryListDesktop : null,
        ]}
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((category) => {
          const active = activeCategory === category;
          const CategoryIcon = getCategoryIcon(category);

          return (
            <MotionPressable
              accessibilityRole="button"
              key={category}
              onPress={() => onSelectCategory(category)}
              pressScale={motion.scale.subtlePress}
              style={[
                styles.shopDirectoryCategoryButton,
                isDesktop ? styles.shopDirectoryCategoryButtonDesktop : null,
                active ? styles.shopDirectoryCategoryButtonActive : null,
              ]}
            >
              <View style={styles.shopDirectoryCategoryIconCell}>
                <CategoryIcon
                  color={active ? colors.white : colors.accent}
                  size={isDesktop ? 18 : 16}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.shopDirectoryCategoryText,
                  active ? styles.shopDirectoryCategoryTextActive : null,
                ]}
              >
                {tc(category)}
              </Text>
            </MotionPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
