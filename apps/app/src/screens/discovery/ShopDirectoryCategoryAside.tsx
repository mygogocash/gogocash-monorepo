import { ScrollView, Text, View } from "react-native";
import { CategoryGlyph } from "@mobile/components/CategoryGlyph";
import { webShopDirectory } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

export function ShopDirectoryCategoryAside({
  activeCategory,
  categories = webShopDirectory.categories,
  categoryIconKeys,
  categoryIconImages,
  isDesktop,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  categories?: readonly string[];
  /** Optional admin/API icon_key by category name (Phase C). */
  categoryIconKeys?: Readonly<Record<string, string>>;
  /** Optional custom uploaded icon URL by category name. */
  categoryIconImages?: Readonly<Record<string, string>>;
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
        {tc(webShopDirectory.categoryHeading)}
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
                <CategoryGlyph
                  category={category}
                  color={active ? colors.white : colors.accent}
                  iconKey={categoryIconKeys?.[category]}
                  imageUrl={categoryIconImages?.[category]}
                  size={isDesktop ? 18 : 16}
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
