import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import {
  getDesktopFooterHorizontalPadding,
  mobileShellLayout,
} from "@mobile/design/webDesignParity";

type CustomerDesktopFooterSlotProps = {
  /** Extra horizontal inset from a padded scroll/frame ancestor (added to shell offset). */
  innerPadding?: number;
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
};

export function CustomerDesktopFooterSlot({
  horizontalPadding,
  innerPadding = 0,
  style,
}: CustomerDesktopFooterSlotProps) {
  const { width } = useWindowDimensions();

  if (width < mobileShellLayout.desktopBreakpoint) {
    return null;
  }

  const resolvedHorizontalPadding =
    horizontalPadding ?? getDesktopFooterHorizontalPadding(width, innerPadding);

  return (
    <View style={[styles.footerSlot, style]}>
      <CustomerDesktopFooter
        horizontalPadding={resolvedHorizontalPadding}
        viewportWidth={width}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footerSlot: {
    width: "100%",
  },
});
