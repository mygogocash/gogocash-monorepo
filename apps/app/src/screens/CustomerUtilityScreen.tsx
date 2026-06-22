import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { mobileShellLayout } from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

type UtilityMode = "ageVerification" | "creditScore" | "membership" | "missingOrders";

const models: Record<
  UtilityMode,
  {
    action: string;
    body: string;
    rows: readonly string[];
    title: string;
  }
> = {
  ageVerification: {
    action: "Start verification",
    body: "Confirm eligibility for age-restricted rewards and account features.",
    rows: ["Identity check", "Date of birth", "Verification status"],
    title: "Age Verification",
  },
  creditScore: {
    action: "View score",
    body: "Track account signals that can unlock better reward experiences.",
    rows: ["Profile completion", "Cashback activity", "Quest progress"],
    title: "Credit Score",
  },
  membership: {
    action: "View benefits",
    body: "Review GoGoCash membership benefits and customer reward tiers.",
    rows: ["Cashback boosts", "Priority offers", "Member perks"],
    title: "Membership",
  },
  missingOrders: {
    action: "Report order",
    body: "Submit missing cashback details when an eligible tracked order does not appear.",
    rows: ["Merchant", "Order date", "Order evidence"],
    title: "Missing Orders",
  },
};

export function CustomerUtilityScreen({ mode }: { mode: UtilityMode }) {
  const styles = useThemedStyles(createUtilityScreenStyles);
  const insets = useSafeAreaInsets();
  const model = models[mode];

  return (
    <View style={styles.viewport}>
      <View style={styles.phoneFrame}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: Math.max(spacing.md, insets.top + spacing.md) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.kicker}>GoGoCash</Text>
            <Text style={styles.title}>{model.title}</Text>
            <Text style={styles.body}>{model.body}</Text>
            <Pressable style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>{model.action}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {model.rows.map((row) => (
              <View key={row} style={styles.row}>
                <Text style={styles.rowText}>{row}</Text>
                <Text style={styles.rowArrow}>{">"}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function createUtilityScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  phoneFrame: {
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: mobileShellLayout.contentMaxWidth,
    width: "100%",
  },
  page: {
    gap: spacing.homeStackGap,
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  hero: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.accent,
    fontSize: typography.headline,
    fontWeight: "700",
  },
  body: {
    color: colors.accentSoft,
    fontSize: typography.body,
    lineHeight: 22,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryActionText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  rowText: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: "800",
  },
  rowArrow: {
    color: colors.primaryDark,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
}

