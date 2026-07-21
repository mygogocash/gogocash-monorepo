import { Text, View } from "react-native";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { useHomeScreenStyles } from "./homeScreenHooks";

/**
 * #494 — this labels the popular-picks section, so it renders as a plain text heading
 * rather than the tinted, bordered, icon-bearing card it used to be. Same shape as the
 * "Matching brands & products" heading a few lines up in HomeSearchPopularPopover, so
 * the two sections of the dropdown read as siblings.
 */
export function HomeSearchIntro({ variant }: { variant: "compact" | "large" }) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const compact = variant === "compact";

  return (
    <View style={styles.searchPopoverIntro}>
      <Text style={[styles.searchPopoverTitle, compact ? styles.searchPopoverTitleCompact : null]}>
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
  );
}
