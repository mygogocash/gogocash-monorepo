import { createElement, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// Test stub for @shopify/flash-list used ONLY by the render-test config.
// The real package ships types the render harness cannot parse ("Unexpected token
// 'typeof'"). Directory grid virtualization is covered by source-signal tests; render
// smoke tests only need a passthrough list. Never bundled into the app.
type FlashListProps<T> = {
  readonly data?: readonly T[];
  readonly keyExtractor?: (item: T, index: number) => string;
  readonly renderItem: (info: { item: T; index: number }) => ReactNode;
  readonly style?: StyleProp<ViewStyle>;
};

export function FlashList<T>({ data, keyExtractor, renderItem, style }: FlashListProps<T>) {
  return createElement(
    View,
    { style },
    ...(data ?? []).map((item, index) =>
      createElement(
        View,
        { key: keyExtractor?.(item, index) ?? String(index) },
        renderItem({ item, index }),
      ),
    ),
  );
}
