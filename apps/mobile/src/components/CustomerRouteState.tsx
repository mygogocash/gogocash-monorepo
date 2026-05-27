import { Link } from "expo-router";
import {
  AlertCircle as AlertIcon,
  CheckCircle2 as CheckIcon,
  Inbox as EmptyIcon,
  Lock as LockIcon,
  WifiOff as OfflineIcon,
} from "lucide-react-native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

export type CustomerRouteStateVariant =
  | "empty"
  | "error"
  | "loading"
  | "offline"
  | "success"
  | "unauthenticated";

export type CustomerRouteStateAction = {
  accessibilityLabel?: string;
  href?: string;
  label: string;
  onPress?: () => void;
};

const routeStateCopy = {
  empty: {
    body: "Nothing is available here yet.",
    title: "No activity yet",
  },
  error: {
    body: "Something went wrong. Please try again.",
    title: "We could not load this page",
  },
  loading: {
    body: "Preparing your GoGoCash experience.",
    title: "Loading GoGoCash",
  },
  offline: {
    body: "Reconnect to the internet, then try again.",
    title: "You are offline",
  },
  success: {
    body: "Your request was completed.",
    title: "Done",
  },
  unauthenticated: {
    body: "Sign in to continue to this GoGoCash page.",
    title: "Sign in required",
  },
} satisfies Record<CustomerRouteStateVariant, { body: string; title: string }>;

export function CustomerRouteState({
  action,
  body,
  secondaryAction,
  testID,
  title,
  variant,
}: {
  action?: CustomerRouteStateAction;
  body?: string;
  secondaryAction?: CustomerRouteStateAction;
  testID?: string;
  title?: string;
  variant: CustomerRouteStateVariant;
}) {
  const copy = routeStateCopy[variant];
  const isAlertVariant = variant === "error" || variant === "offline";

  return (
    <View style={styles.viewport} testID={testID}>
      <View style={styles.phoneFrame}>
        <View accessibilityRole={isAlertVariant ? "alert" : undefined} style={styles.card}>
          <View style={[styles.iconShell, styles[`${variant}IconShell`]]}>
            {variant === "loading" ? (
              <ActivityIndicator color={colors.primaryDark} size="large" />
            ) : (
              renderStateIcon(variant)
            )}
          </View>
          <Text style={styles.title}>{title ?? copy.title}</Text>
          <Text style={styles.body}>{body ?? copy.body}</Text>
          {action || secondaryAction ? (
            <View style={styles.actionStack}>
              {action ? <RouteStateAction action={action} emphasis="primary" /> : null}
              {secondaryAction ? (
                <RouteStateAction action={secondaryAction} emphasis="secondary" />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      <CustomerDesktopFooterSlot style={styles.desktopFooter} />
    </View>
  );
}

function renderStateIcon(variant: Exclude<CustomerRouteStateVariant, "loading">) {
  if (variant === "error") {
    return <AlertIcon color={colors.danger} size={34} strokeWidth={typography.iconStrokeWidth} />;
  }

  if (variant === "offline") {
    return (
      <OfflineIcon color={colors.accent} size={34} strokeWidth={typography.iconStrokeWidth} />
    );
  }

  if (variant === "unauthenticated") {
    return <LockIcon color={colors.accent} size={34} strokeWidth={typography.iconStrokeWidth} />;
  }

  if (variant === "success") {
    return (
      <CheckIcon color={colors.primaryDark} size={34} strokeWidth={typography.iconStrokeWidth} />
    );
  }

  return <EmptyIcon color={colors.primaryDark} size={34} strokeWidth={typography.iconStrokeWidth} />;
}

function RouteStateAction({
  action,
  emphasis,
}: {
  action: CustomerRouteStateAction;
  emphasis: "primary" | "secondary";
}) {
  const button = (
    <MotionPressable
      accessibilityLabel={action.accessibilityLabel}
      accessibilityRole={action.href ? "link" : "button"}
      onPress={action.onPress}
      pressScale={0.98}
      style={StyleSheet.flatten([
        styles.actionButton,
        emphasis === "secondary" ? styles.secondaryAction : null,
      ])}
    >
      <Text
        style={[
          styles.actionText,
          emphasis === "secondary" ? styles.secondaryActionText : null,
        ]}
      >
        {action.label}
      </Text>
    </MotionPressable>
  );

  if (!action.href) {
    return button;
  }

  return (
    <Link asChild href={action.href as never}>
      {button}
    </Link>
  );
}

const styles = StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  phoneFrame: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    maxWidth: mobileShellLayout.contentMaxWidth,
    padding: spacing.lg,
    width: "100%",
  },
  desktopFooter: {
    width: "100%",
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 430,
    padding: spacing.xl,
    width: "100%",
    boxShadow: shadows.cardCss,
  },
  iconShell: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  emptyIconShell: {
    backgroundColor: colors.primarySoft,
  },
  errorIconShell: {
    backgroundColor: "#FFE8E8",
  },
  loadingIconShell: {
    backgroundColor: colors.primarySoft,
  },
  offlineIconShell: {
    backgroundColor: colors.warningSoft,
  },
  successIconShell: {
    backgroundColor: colors.primarySoft,
  },
  unauthenticatedIconShell: {
    backgroundColor: "#EAF7F3",
  },
  title: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: typography.titleWeight,
    letterSpacing: typography.letterSpacing,
    lineHeight: typography.titleLineHeight,
    textAlign: "center",
  },
  body: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    lineHeight: typography.bodyLineHeight,
    textAlign: "center",
  },
  actionStack: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    width: "100%",
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  secondaryAction: {
    backgroundColor: colors.card,
  },
  actionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.action,
    fontWeight: typography.actionWeight,
    lineHeight: typography.actionLineHeight,
  },
  secondaryActionText: {
    color: colors.primaryDark,
  },
});
