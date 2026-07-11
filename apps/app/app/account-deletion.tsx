import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useCopy } from "@mobile/i18n/useCopy";
import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

/**
 * Public account-deletion page — the web URL Google Play's Data safety form
 * requires (reachable without signing in, including by users who already
 * uninstalled the app). Mirrors the in-app flow's 30-day soft-delete policy.
 */
export default function AccountDeletionRoute() {
  const styles = useThemedStyles(createAccountDeletionStyles);
  const tc = useCopy();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>{tc("Delete your GoGoCash account")}</Text>
        <Text style={styles.body}>
          {tc(
            "Deleting your account permanently removes your personal data — profile, contact details, and login credentials — after a 30-day grace period. Records we must keep by law (for example tax or fraud rules) are anonymized instead of deleted.",
          )}
        </Text>

        <Text style={styles.stepTitle}>{tc("From the app")}</Text>
        <Text style={styles.body}>
          {tc(
            "Sign in, open Profile → Account Setting, and tap 'Request account deletion'. You'll be asked to confirm, then signed out. The deletion completes automatically after 30 days.",
          )}
        </Text>

        <Text style={styles.stepTitle}>{tc("From this page")}</Text>
        <Text style={styles.body}>
          {tc(
            "Sign in below to use the same flow, or — if you no longer have access to the app or your login — email support@gogocash.co from the address on your account and we will process the request within 30 days.",
          )}
        </Text>

        <Link href="/language" style={styles.link}>
          {tc("Sign in and manage my account")}
        </Link>

        <Text style={styles.footnote}>
          {tc(
            "Changed your mind? Contact support within the 30-day window and we can cancel a pending deletion.",
          )}
        </Text>
      </View>
    </ScrollView>
  );
}

function createAccountDeletionStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: {
      alignItems: "center",
      backgroundColor: colors.background,
      flexGrow: 1,
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.md,
      maxWidth: 560,
      padding: spacing.lg,
      width: "100%",
    },
    title: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 24,
      fontWeight: "700",
      lineHeight: 30,
    },
    stepTitle: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 21,
    },
    body: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 15,
      lineHeight: 22,
    },
    link: {
      color: colors.primary,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "600",
    },
    footnote: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
