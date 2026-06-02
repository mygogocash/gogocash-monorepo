import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface KeyboardAwareScreenProps {
  children: ReactNode;
  // Passed through to the inner ScrollView's contentContainerStyle so form
  // screens keep control of their padding/gap without re-wrapping.
  contentContainerStyle?: StyleProp<ViewStyle>;
  // Lets a screen freeze scrolling (e.g. while a sheet is open) without losing
  // the keyboard-avoidance behavior. Defaults to scrollable.
  scrollEnabled?: boolean;
}

// A4 — drop-in wrapper for form screens. On iOS the keyboard pushes content up
// with "padding"; on Android "height" resizes the avoiding view. On web,
// KeyboardAvoidingView is a layout no-op (no soft keyboard), so existing screen
// layout is unaffected. Presentational only — no business logic.
export function KeyboardAwareScreen({
  children,
  contentContainerStyle,
  scrollEnabled = true,
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        style={styles.flex}
        testID="keyboard-aware-scroll"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
