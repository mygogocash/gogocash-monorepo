import { Link } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { ArrowRight as ArrowRightIcon } from "@mobile/theme/icons";
import homeBannerImage from "../../../assets/home-banner.png";
import { webCategoryDirectory } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { categoryDirectoryImageAssets } from "./directoryAssets";
import { type CategoryDirectoryItem } from "./discoveryTypes";

export function CategoryDirectoryCard({
  cardWidth,
  category,
  index,
  isDesktop,
}: {
  cardWidth: number;
  category: CategoryDirectoryItem;
  index: number;
  isDesktop: boolean;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const imageSource = categoryDirectoryImageAssets[category.imageAsset] ?? homeBannerImage;

  return (
    <Link asChild href={category.href as never}>
      <MotionPressable
        accessibilityLabel={`${category.title} ${webCategoryDirectory.cardCta}`}
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([
          styles.categoryDirectoryCard,
          {
            width: cardWidth,
          },
          isDesktop ? styles.categoryDirectoryCardDesktop : null,
        ])}
        testID={`category-directory-card-${index}`}
      >
        <View style={styles.categoryDirectoryImageFrame}>
          <Image
            alt={`${category.title} category image`}
            accessibilityLabel={`${category.title} category image`}
            resizeMode="cover"
            source={imageSource}
            style={styles.categoryDirectoryImage}
          />
          <View style={styles.categoryDirectoryBadge}>
            <Text style={styles.categoryDirectoryBadgeText}>{tc(webCategoryDirectory.cardEyebrow)}</Text>
          </View>
        </View>

        <View style={styles.categoryDirectoryCardBody}>
          <Text
            numberOfLines={2}
            style={[
              styles.categoryDirectoryCardTitle,
              isDesktop ? styles.categoryDirectoryCardTitleDesktop : null,
            ]}
          >
            {tc(category.title)}
          </Text>
          <View style={styles.categoryDirectoryCardFooter}>
            <Text numberOfLines={1} style={styles.categoryDirectoryCardCta}>
              {tc(webCategoryDirectory.cardCta)}
            </Text>
            <View style={styles.categoryDirectoryArrowCircle}>
              <ArrowRightIcon
                color={colors.primaryDark}
                size={16}
                strokeWidth={typography.iconStrokeWidth}
                style={styles.categoryDirectoryArrowIcon}
              />
            </View>
          </View>
        </View>
      </MotionPressable>
    </Link>
  );
}
