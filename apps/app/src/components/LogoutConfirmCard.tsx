import { StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

/**
 * Confirm prompt shown before tearing down the session. Shared by the mobile
 * profile hub and the desktop profile sidebar so the copy + styling stay aligned.
 */
export function LogoutConfirmCard({
  onCancel,
  onConfirm,
  pending,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const tc = useCopy();
  const styles = useThemedStyles(createLogoutConfirmCardStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{tc("Log out of GoGoCash?")}</Text>
      <Text style={styles.body}>
        {tc("This clears your saved session on this device before returning to sign in.")}
      </Text>
      <View style={styles.actions}>
        <MotionPressable
          accessibilityRole="button"
          disabled={pending}
          onPress={onCancel}
          pressScale={0.98}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>{tc("Cancel")}</Text>
        </MotionPressable>
        <MotionPressable
          accessibilityRole="button"
          disabled={pending}
          onPress={onConfirm}
          pressScale={0.98}
          style={styles.confirmButton}
        >
          <Text style={styles.confirmText}>{pending ? tc("Logging out") : tc("Log out")}</Text>
        </MotionPressable>
      </View>
    </View>
  );
}

function createLogoutConfirmCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.chip,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  cancelText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  confirmText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "800",
  },
});
}

