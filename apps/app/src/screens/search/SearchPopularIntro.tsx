import { Text, View } from "react-native";

import { useCopy } from "@mobile/i18n/useCopy";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { TrendingUp as TrendingUpIcon } from "@mobile/theme/icons";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createSearchScreenStyles } from "./createSearchScreenStyles";

type SearchPopularIntroProps = {
  readonly variant: "compact" | "large";
};

export function SearchPopularIntro({ variant }: SearchPopularIntroProps) {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const compact = variant === "compact";

  return (
    <View style={[styles.popularIntro, compact ? styles.popularIntroCompact : null]}>
      <View style={[styles.popularIntroIcon, compact ? styles.popularIntroIconCompact : null]}>
        <TrendingUpIcon color={colors.primaryDark} size={compact ? 20 : 24} strokeWidth={2.2} />
      </View>
      <View style={styles.popularIntroCopy}>
        <Text style={[styles.popularIntroTitle, compact ? styles.popularIntroTitleCompact : null]}>
          {tc(webHomeSearchPopularPanel.title)}
        </Text>
        <Text
          style={[
            styles.popularIntroSubtitle,
            compact ? styles.popularIntroSubtitleCompact : null,
          ]}
        >
          {tc(webHomeSearchPopularPanel.subtitle)}
        </Text>
      </View>
    </View>
  );
}
