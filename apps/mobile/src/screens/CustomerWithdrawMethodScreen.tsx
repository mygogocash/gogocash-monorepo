import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Landmark as BankIcon,
  SquarePlus as AddIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout, webWithdrawMethodPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type WithdrawMethod = (typeof webWithdrawMethodPage.methods)[number];

export function CustomerWithdrawMethodScreen() {
  return (
    <WithdrawMethodSubPage>
      <WithdrawMethodTopBar />
      <View style={styles.content}>
        <WithdrawMethodHeader />
        <WithdrawMethodGrid />
      </View>
    </WithdrawMethodSubPage>
  );
}

function WithdrawMethodSubPage({ children }: { children: ReactNode }) {
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webWithdrawMethodPage.title)}>
      <View style={[styles.surface, styles.withdrawMethodSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function WithdrawMethodTopBar() {
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{tc(webWithdrawMethodPage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function WithdrawMethodHeader() {
  const tc = useCopy();
  return (
    <View style={styles.headerRow}>
      <Text style={styles.heading}>{tc(webWithdrawMethodPage.heading)}</Text>
      <Link asChild href="/method/create">
        <MotionPressable pressScale={0.98} style={styles.addButton}>
          <AddIcon color={colors.white} size={16} strokeWidth={typography.iconStrokeWidth} />
          <Text style={styles.addButtonText}>{tc(webWithdrawMethodPage.addLabel)}</Text>
        </MotionPressable>
      </Link>
    </View>
  );
}

function WithdrawMethodGrid() {
  const { width } = useWindowDimensions();
  const twoColumn = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.methodGrid}>
      {webWithdrawMethodPage.methods.map((method) => (
        <WithdrawMethodBankCard
          key={method.id}
          method={method}
          style={twoColumn ? styles.methodCardDesktop : styles.methodCardMobile}
        />
      ))}
    </View>
  );
}

function WithdrawMethodBankCard({
  method,
  style,
}: {
  method: WithdrawMethod;
  style: object;
}) {
  return (
    <Link asChild href={`/method/create?id=${method.id}` as never}>
      <MotionPressable pressScale={0.99} style={StyleSheet.flatten([styles.methodCard, style])}>
        {method.isDefault ? <DefaultBadge /> : null}
        <View style={styles.methodCardContent}>
          <BankIcon color={colors.primaryDark} size={32} strokeWidth={1.5} />
          <View style={styles.methodCopy}>
            <Text style={styles.methodAccountName}>{method.accountName}</Text>
            <Text style={styles.methodMeta}>
              {method.bankName}
              {"  ·  "}
              <Text style={styles.methodAccountTail}>{method.maskedAccount}</Text>
            </Text>
          </View>
        </View>
      </MotionPressable>
    </Link>
  );
}

function DefaultBadge() {
  const tc = useCopy();
  return (
    <View style={styles.defaultBadge}>
      <Text style={styles.defaultBadgeText}>{tc(webWithdrawMethodPage.defaultLabel)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  withdrawMethodSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 18,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    gap: 40,
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 28,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minWidth: 0,
  },
  heading: {
    color: "#102217",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 31,
    minWidth: 0,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: 12,
    height: 40,
    justifyContent: "center",
    minWidth: 166,
    paddingHorizontal: 24,
  },
  addButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    width: "100%",
  },
  methodCard: {
    alignItems: "flex-start",
    backgroundColor: "#F6FDFB",
    borderColor: "#D8EDE4",
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 4px 24px rgba(0,204,153,0.08)",
    justifyContent: "space-between",
    minHeight: 183,
    overflow: "visible",
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: "relative",
  },
  methodCardMobile: {
    width: "100%",
  },
  methodCardDesktop: {
    flexGrow: 1,
    flexShrink: 1,
    width: "47%",
  },
  methodCardContent: {
    gap: 16,
  },
  methodCopy: {
    gap: 4,
  },
  methodAccountName: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  methodMeta: {
    color: "#3D6B5C",
    flexWrap: "wrap",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  methodAccountTail: {
    color: "#2D6A4F",
    fontWeight: "500",
  },
  defaultBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 100,
    borderTopLeftRadius: 100,
    boxShadow: "0 2px 12px rgba(0,204,153,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    position: "absolute",
    right: 0,
    top: 30,
  },
  defaultBadgeText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
