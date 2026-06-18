import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { mobileShellLayout } from "@mobile/design/webDesignParity";

type CustomerDesktopFooterSlotProps = {
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
};

export function CustomerDesktopFooterSlot({
  horizontalPadding = 0,
  style,
}: CustomerDesktopFooterSlotProps) {
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
