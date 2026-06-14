import { createElement, Fragment, type ReactNode } from "react";

// Test stub for react-native-safe-area-context used ONLY by the render-test config.
// The real package ships source with a value-position `typeof` type alias the
// render config's rolldown/oxc TS-stripping transform rejects ("Unexpected token
// 'typeof'", though tsc accepts it). It is imported by AccountPageShell (and thus
// the 14 screens that use the shell) plus other screens. Insets are irrelevant to
// render smoke tests, so providers pass through and the hooks return zeroes.
// Never bundled into the app.
const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const ZERO_FRAME = { x: 0, y: 0, width: 0, height: 0 };

export function SafeAreaProvider({ children }: { children?: ReactNode }) {
  return createElement(Fragment, null, children);
}

export function SafeAreaView({ children }: { children?: ReactNode }) {
  return createElement(Fragment, null, children);
}

export function useSafeAreaInsets() {
  return ZERO_INSETS;
}

export function useSafeAreaFrame() {
  return ZERO_FRAME;
}

export const initialWindowMetrics = { insets: ZERO_INSETS, frame: ZERO_FRAME };
