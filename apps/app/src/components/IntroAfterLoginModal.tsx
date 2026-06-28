import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { consumeIntroModalPending } from "@mobile/features/introModal/introModalSession";
import { webIntroModal } from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { spacing, typography } from "@mobile/theme/tokens";

// First-visit "Every Purchase Pays You Back." modal. Mirrors the web ModalAfterLogin:
// shows once after sign-in on the home screen, auto-dismisses after 30s. Self-managing — reads
// the session flag on mount and renders an overlay (View-based, matching the app's overlay
// pattern — no RN <Modal>) or null.
export function IntroAfterLoginModal() {
  const styles = useThemedStyles(createIntroAfterLoginModalStyles);
  const [visible, setVisible] = useState(() => consumeIntroModalPending());

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const timer = setTimeout(() => setVisible(false), webIntroModal.autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  const dismiss = () => setVisible(false);

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onPress={dismiss}
        style={styles.backdrop}
      />
      <View
        accessibilityRole="alert"
        accessibilityLabel={`${webIntroModal.headingLead}${webIntroModal.headingHighlight}${webIntroModal.headingTail}`}
        style={styles.card}
      >
        <Pressable
          accessibilityLabel={webIntroModal.closeLabel}
          accessibilityRole="button"
          hitSlop={10}
          onPress={dismiss}
          style={styles.closeButton}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.heading}>
          {webIntroModal.headingLead}
          <Text style={styles.headingHighlight}>{webIntroModal.headingHighlight}</Text>
          {webIntroModal.headingTail}
        </Text>
      </View>
    </View>
  );
}

function createIntroAfterLoginModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 100,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18)",
    justifyContent: "center",
    maxWidth: 1025,
    minHeight: 320,
    paddingHorizontal: spacing.xl,
    paddingVertical: 56,
    width: "100%",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 16,
    width: 40,
  },
  closeIcon: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 20,
  },
  heading: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 48,
    maxWidth: 640,
    textAlign: "center",
  },
  headingHighlight: {
    color: colors.primary,
  },
});
}

