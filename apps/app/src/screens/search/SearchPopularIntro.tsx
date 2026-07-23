import { Text, View } from "react-native";

import { useCopy } from "@mobile/i18n/useCopy";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { TrendingUp as TrendingUpIcon } from "@mobile/theme/icons";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createSearchScreenStyles } from "./createSearchScreenStyles";

const MOBILE_POPULAR_SUBTITLE = "Hand-picked stores with standout cashback.";

export function SearchPopularIntro() {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();

  return (
    <View style={styles.popularIntro}>
      <View style={styles.popularIntroIcon}>
        <TrendingUpIcon color={colors.primaryDark} size={20} strokeWidth={2.2} />
      </View>
      <View style={styles.popularIntroCopy}>
        <Text style={styles.popularIntroTitle}>{tc(webHomeSearchPopularPanel.title)}</Text>
        <Text style={styles.popularIntroSubtitle}>
          {tc(MOBILE_POPULAR_SUBTITLE)}
        </Text>
      </View>
    </View>
  );
}
