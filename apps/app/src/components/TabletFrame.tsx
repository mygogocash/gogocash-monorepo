import { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { useDeviceClass, useTabletContentFrame } from "@mobile/hooks/useDeviceClass";

/**
 * Centers single-column content within the tablet content frame (768-1023px) so
 * it reads as an intentional centered layout instead of a stretched phone.
 *
 * On mobile (<768) and desktop (>=1024) this is a transparent pass-through — it
 * renders children unchanged so existing phone/desktop layouts are untouched.
 * Only the tablet band gets the capped, centered column.
 *
 * Use it to wrap a screen's main scroll content (or article body). It is safe to
 * nest around content that already declares its own maxWidth: on tablet this
 * frame's cap (tabletContentMaxWidth) binds first.
 */
export function TabletFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const deviceClass = useDeviceClass();
  const frame = useTabletContentFrame();

  if (deviceClass !== "tablet") {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        {
          alignSelf: "center",
          maxWidth: frame.maxWidth,
          paddingHorizontal: frame.horizontalPadding,
          width: "100%",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
