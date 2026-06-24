import { Text, View } from "react-native";
import { TrendingUp as TrendingUpIcon } from "@mobile/theme/icons";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { useHomeScreenColors, useHomeScreenStyles } from "./homeScreenHooks";

export function HomeSearchIntro({ variant }: { variant: "compact" | "large" }) {
  const styles = useHomeScreenStyles();
  const colors = useHomeScreenColors();
  const tc = useCopy();
  const compact = variant === "compact";

  return (
    <View style={[styles.searchPopoverIntro, compact ? styles.searchPopoverIntroCompact : null]}>
      <View style={[styles.searchTrendingIcon, compact ? styles.searchTrendingIconCompact : null]}>
        <TrendingUpIcon color={colors.primaryDark} size={compact ? 20 : 24} strokeWidth={2.2} />
      </View>
      <View style={styles.searchIntroCopy}>
        <Text
          style={[styles.searchPopoverTitle, compact ? styles.searchPopoverTitleCompact : null]}
        >
          {tc(webHomeSearchPopularPanel.title)}
        </Text>
        <Text
          style={[
            styles.searchPopoverSubtitle,
            compact ? styles.searchPopoverSubtitleCompact : null,
          ]}
        >
          {tc(webHomeSearchPopularPanel.subtitle)}
        </Text>
      </View>
    </View>
  );
}
