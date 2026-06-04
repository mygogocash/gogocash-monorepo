import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft as ChevronLeftIcon } from "@mobile/theme/icons";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { ProfileInfoPanel } from "@mobile/components/ProfileInfoPanel";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

// Re-exported from the shared panel (which now owns the personal-info form) so existing
// unit tests can keep importing the identity validators from this screen module.
export { isValidBirthdate, isValidPassportId } from "@mobile/components/ProfileInfoPanel";

type ProfileDetailMode =
  | "favorite"
  | "info"
  | "language"
  | "offer"
  | "phone"
  | "privacy"
  | "rating"
  | "referral"
  | "verifyPhone";

const models: Record<
  ProfileDetailMode,
  {
    action: string;
    body: string;
    rows: readonly string[];
    title: string;
  }
> = {
  favorite: {
    action: "Explore brands",
    body: "Save merchants you visit often and return to their cashback offers quickly.",
    rows: ["No favorite brands yet", "Browse partners", "Save cashback picks"],
    title: "Favorite Brands",
  },
  info: {
    action: "Save profile",
    body: "Keep your customer profile aligned with reward and verification records.",
    rows: ["Email", "Username", "Mobile number"],
    title: "Personal Information",
  },
  language: {
    action: "Save language",
    body: "Choose the app language used across GoGoCash customer surfaces.",
    rows: ["English", "Thai", "Device default"],
    title: "Language",
  },
  offer: {
    action: "Browse offers",
    body: "Review saved and activated cashback offers from your account.",
    rows: ["Activated offers", "Saved offers", "Expired offers"],
    title: "My Offers",
  },
  phone: {
    action: "Send code",
    body: "Add a reachable phone number for account and payout verification.",
    rows: ["Phone number", "Country code", "SMS consent"],
    title: "Confirm Phone",
  },
  privacy: {
    action: "Update preferences",
    body: "Manage consent, data access, and GoGoCash privacy preferences.",
    rows: ["Consent status", "Data requests", "GoGoSense history"],
    title: "Privacy Center",
  },
  rating: {
    action: "View details",
    body: "Check account progress and reward eligibility signals.",
    rows: ["Account score", "Cashback activity", "Quest progress"],
    title: "My Rating",
  },
  referral: {
    action: "Share invite",
    body: "Share GoGoCash and track referral rewards from one place.",
    rows: ["Invite link", "Pending rewards", "Completed referrals"],
    title: "Refer Your Friends",
  },
  verifyPhone: {
    action: "Verify",
    body: "Enter the verification code sent to your mobile number.",
    rows: ["Verification code", "Resend code", "Change number"],
    title: "Verify Phone",
  },
};

export function CustomerProfileDetailScreen({ mode }: { mode: ProfileDetailMode }) {
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const session = useMobileSessionSnapshot();
  const model = models[mode];

  if (mode === "info") {
    return (
      <ProfileInfoSubPage>
        {/* Mobile-only back link — desktop uses the persistent sidebar (web parity). */}
        {isDesktop ? null : <ProfileInfoTopBar />}
        {/* Wrap the rich panel in KeyboardAwareScreen so the on-screen keyboard
            doesn't cover the focused field. No-op layout on web. */}
        <KeyboardAwareScreen contentContainerStyle={styles.profileInfoContent}>
          <ProfileInfoPanel session={session ?? {}} />
        </KeyboardAwareScreen>
      </ProfileInfoSubPage>
    );
  }

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
            <Text style={styles.kicker}>{tc("Profile")}</Text>
            <Text style={styles.title}>{tc(model.title)}</Text>
            <Text style={styles.body}>{tc(model.body)}</Text>
            <Pressable style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>{tc(model.action)}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {model.rows.map((row) => (
              <View key={row} style={styles.row}>
                <Text style={styles.rowText}>{tc(row)}</Text>
                <Text style={styles.rowArrow}>{">"}</Text>
              </View>
            ))}
          </View>

          <Link asChild href="/profile">
            <Pressable style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>{tc("Back to Profile")}</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </View>
    </View>
  );
}

function ProfileInfoSubPage({ children }: { children: ReactNode }) {
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc("Profile")}>
      <View style={styles.profileInfoSubPageSurface}>{children}</View>
    </AccountPageShell>
  );
}

function ProfileInfoTopBar() {
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.profileInfoTopBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.profileInfoTopBarTitle}>{tc("Profile")}</Text>
      </Pressable>
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
  profileInfoSubPageSurface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  profileInfoTopBar: {
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
  profileInfoTopBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
  profileInfoContent: {
    gap: spacing.lg,
    padding: spacing.md,
  },
  hero: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
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
    color: colors.ink,
    fontSize: typography.headline,
    fontWeight: "700",
  },
  body: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 48,
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
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  secondaryActionText: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
