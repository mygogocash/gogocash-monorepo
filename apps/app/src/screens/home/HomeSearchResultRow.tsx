import { Image } from "expo-image";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { brandHref } from "./homeHelpers";
import { useHomeScreenStyles } from "./homeScreenHooks";
import { type HomeSearchPanelItem } from "./homeTypes";

type SearchResultItem = HomeSearchPanelItem & {
  href?: string;
  logoUri?: string;
};

export function HomeSearchResultRow({
  item,
  variant,
}: {
  item: SearchResultItem;
  variant: "compact" | "large";
}) {
  const styles = useHomeScreenStyles();
  const { colors } = useTheme();
  const tc = useCopy();
  const compact = variant === "compact";
  const href = item.href ?? brandHref(item.brand);
  const logoBackground = item.logoUri ? colors.card : item.logoBackground;

  return (
    <Link asChild href={href as never}>
      <MotionPressable
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([
          styles.searchResultRow,
          compact ? styles.searchResultRowCompact : null,
        ])}
      >
        <View
          style={[
            styles.searchResultLogo,
            compact ? styles.searchResultLogoCompact : null,
            { backgroundColor: logoBackground },
          ]}
        >
          {item.logoUri ? (
            <Image
              accessibilityLabel={`${item.brand} logo`}
              cachePolicy="memory-disk"
              contentFit="contain"
              recyclingKey={item.logoUri}
              source={{ uri: item.logoUri }}
              style={styles.searchResultLogoImage}
            />
          ) : (
            <Text
              style={[
                styles.searchResultLogoText,
                compact ? styles.searchResultLogoTextCompact : null,
                { color: item.logoTextColor },
              ]}
            >
              {item.logoText}
            </Text>
          )}
        </View>
        <View style={styles.searchResultCopy}>
          <Text
            numberOfLines={1}
            style={[styles.searchResultName, compact ? styles.searchResultNameCompact : null]}
          >
            {item.brand}
          </Text>
          <View style={styles.searchResultCashbackRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.searchResultCaption,
                compact ? styles.searchResultCaptionCompact : null,
              ]}
            >
              {tc("Cashback upto")}
            </Text>
            <Text
              style={[
                styles.searchResultCashback,
                compact ? styles.searchResultCashbackCompact : null,
              ]}
            >
              {item.cashback}
            </Text>
          </View>
        </View>
        <View
          style={[styles.searchResultAction, compact ? styles.searchResultActionCompact : null]}
        >
          <Text
            style={[
              styles.searchResultActionText,
              compact ? styles.searchResultActionTextCompact : null,
            ]}
          >
            {tc(webHomeSearchPopularPanel.actionLabel)}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
}
