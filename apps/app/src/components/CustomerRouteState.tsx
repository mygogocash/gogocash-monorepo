import { useContext, type ReactNode } from "react";
import { Link } from "expo-router";
import { IntlContext, type MessageDescriptor } from "react-intl";
import {
  AlertCircle as AlertIcon,
  CheckCircle2 as CheckIcon,
  Inbox as EmptyIcon,
  Lock as LockIcon,
  WifiOff as OfflineIcon,
} from "@mobile/theme/icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { toastErrorMessages } from "@mobile/i18n/toastMessages";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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

// Resolve a message via react-intl when an IntlProvider is mounted (the real app: LocaleProvider),
// else fall back to the descriptor's English `defaultMessage`. Reading IntlContext directly (rather
// than useIntl()) is non-throwing, so the component still renders when mounted in isolation.
function useSafeFormatMessage(): (descriptor: MessageDescriptor) => string {
  const intl = useContext(IntlContext);
  return (descriptor: MessageDescriptor): string =>
    intl ? intl.formatMessage(descriptor) : (descriptor.defaultMessage as string);
}

// react-intl message descriptors per variant. `id` resolves against the merged catalog (web + mobile
// overlay) under the active locale; `defaultMessage` preserves the original English so the copy still
// renders correctly when no IntlProvider is mounted (e.g. isolated render smoke tests).
const routeStateCopy = {
  empty: {
    body: { defaultMessage: "Nothing is available here yet.", id: "mobileStateEmptyBody" },
    title: { defaultMessage: "No activity yet", id: "mobileStateEmptyTitle" },
  },
  error: {
    body: {
      defaultMessage: toastErrorMessages.generic,
      id: "mobileStateErrorBody",
    },
    title: { defaultMessage: "We could not load this page", id: "mobileStateErrorTitle" },
  },
  loading: {
    body: { defaultMessage: "Preparing your GoGoCash experience.", id: "mobileStateLoadingBody" },
    title: { defaultMessage: "Loading GoGoCash", id: "mobileStateLoadingTitle" },
  },
  offline: {
    body: {
      defaultMessage: "Reconnect to the internet, then try again.",
      id: "mobileStateOfflineBody",
    },
    title: { defaultMessage: "You are offline", id: "mobileStateOfflineTitle" },
  },
  success: {
    body: { defaultMessage: "Your request was completed.", id: "mobileStateSuccessBody" },
    title: { defaultMessage: "Done", id: "mobileStateSuccessTitle" },
  },
  unauthenticated: {
    body: {
      defaultMessage: "Sign in to continue to this GoGoCash page.",
      id: "mobileStateUnauthenticatedBody",
    },
    title: { defaultMessage: "Sign in required", id: "mobileStateUnauthenticatedTitle" },
  },
} satisfies Record<
  CustomerRouteStateVariant,
  { body: { defaultMessage: string; id: string }; title: { defaultMessage: string; id: string } }
>;

export function CustomerRouteState({
  action,
  body,
  loadingSkeleton,
  secondaryAction,
  testID,
  title,
  variant,
}: {
  action?: CustomerRouteStateAction;
  body?: string;
  loadingSkeleton?: ReactNode;
  secondaryAction?: CustomerRouteStateAction;
  testID?: string;
  title?: string;
  variant: CustomerRouteStateVariant;
}) {
  const styles = useThemedStyles(createRouteStateStyles);
  const { colors } = useTheme();
  const formatMessage = useSafeFormatMessage();
  const copy = routeStateCopy[variant];
  const isAlertVariant = variant === "error" || variant === "offline";

  // Wave B (B3): when a loading skeleton is supplied, render it in place of the spinner card so data
  // screens show a content-shaped placeholder. Opt-in — without it the spinner card is unchanged.
  if (variant === "loading" && loadingSkeleton) {
    return (
      <View style={styles.viewport} testID={testID}>
        <View style={styles.phoneFrame}>{loadingSkeleton}</View>
        <CustomerDesktopFooterSlot style={styles.desktopFooter} />
      </View>
    );
  }

  return (
    <View style={styles.viewport} testID={testID}>
      <View style={styles.phoneFrame}>
        <View accessibilityRole={isAlertVariant ? "alert" : undefined} style={styles.card}>
          <View style={[styles.iconShell, styles[`${variant}IconShell`]]}>
            {variant === "loading" ? (
              <ActivityIndicator color={colors.primaryDark} size="large" />
            ) : (
              renderStateIcon(variant, colors)
            )}
          </View>
          <Text style={styles.title}>{title ?? formatMessage(copy.title)}</Text>
          <Text style={styles.body}>{body ?? formatMessage(copy.body)}</Text>
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

function renderStateIcon(variant: Exclude<CustomerRouteStateVariant, "loading">, colors: ThemeColors) {
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
  const styles = useThemedStyles(createRouteStateStyles);
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

function createRouteStateStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    backgroundColor: colors.warningSoft,
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
    backgroundColor: colors.primarySoft,
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
}

