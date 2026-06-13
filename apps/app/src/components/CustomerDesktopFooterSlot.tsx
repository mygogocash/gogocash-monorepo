import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { mobileShellLayout } from "@mobile/design/webDesignParity";

export function CustomerDesktopFooterSlot({
  horizontalPadding = 0,
  style,
}: {
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();

  if (width < mobileShellLayout.desktopBreakpoint) {
    return null;
  }

  return (
    <View style={[styles.footerSlot, style]}>
      <CustomerDesktopFooter horizontalPadding={horizontalPadding} viewportWidth={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  footerSlot: {
    width: "100%",
  },
});
