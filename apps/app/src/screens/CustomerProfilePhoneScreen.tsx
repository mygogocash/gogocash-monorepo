import { Link, useRouter } from "expo-router";
import { ChevronLeft as ChevronLeftIcon, Smartphone as PhoneIcon } from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

// Tap-target expansion for icon/text-only buttons shorter than the 44px minimum
// (chevron back-link + the text-only "Back" buttons). 12px on each side lifts the
// effective hit area past the threshold without changing the visual layout.
const TAP_TARGET_HIT_SLOP = { bottom: 12, left: 12, right: 12, top: 12 } as const;

type PhoneMode = "otp" | "phone";

export function CustomerProfilePhoneScreen({ mode }: { mode: PhoneMode }) {
  return mode === "otp" ? <PhoneOtpScreen /> : <PhoneNumberScreen />;
}

function PhoneNumberScreen() {
  const styles = useThemedStyles(createProfilePhoneScreenStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const tc = useCopy();
  const [phone, setPhone] = useState("");
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline) while the phone field is focused on web.
  const [isInputFocused, setInputFocused] = useState(false);
  const normalizedPhone = phone.replace(/\D/g, "");
  const isValid = normalizedPhone.length >= 9 && normalizedPhone.length <= 10;

  const helperText = useMemo(() => {
    if (!phone) {
      return tc("To keep your account secure, enter the mobile phone number linked to your account.");
    }

    if (!isValid) {
      return tc("Invalid phone number");
    }

    return tc("We will send a verification code to confirm your number.");
  }, [isValid, phone, tc]);

  return (
    <PhoneSubPage title={tc("Verify Phone")}>
      <Text style={styles.title}>{tc("Change Your Phone Number")}</Text>
      <Text style={styles.body}>
        {tc(
          "To keep your account secure, please enter current mobile phone number linked to your account before updating your phone number.",
        )}
      </Text>
      <View style={styles.stepLine} />
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{tc("Mobile Number")}</Text>
        <View style={styles.phoneInputRow}>
          <View style={styles.countrySelect}>
            <Text style={styles.countrySelectText}>{tc("Thailand (TH)")}</Text>
          </View>
          <TextInput
            accessibilityLabel={tc("Mobile Number")}
            keyboardType="phone-pad"
            onBlur={() => setInputFocused(false)}
            onChangeText={setPhone}
            onFocus={() => setInputFocused(true)}
            placeholder="08x xxx xxxx"
            placeholderTextColor={colors.textSoft}
            style={[styles.input, isInputFocused ? styles.inputFocused : null]}
            value={phone}
          />
        </View>
        <Text style={[styles.helper, !isValid && phone ? styles.helperError : null]}>
          {helperText}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <Link asChild href="/profile/info">
          <Pressable hitSlop={TAP_TARGET_HIT_SLOP} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>{tc("Back")}</Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={() => {
            // Invalid numbers give an error cue; a valid one confirms and advances.
            if (!isValid) {
              void haptics.error();
              return;
            }
            void haptics.success();
            router.push("/profile/cf-phone");
          }}
          style={[styles.primaryAction, !isValid ? styles.primaryActionDisabled : null]}
        >
          <Text style={styles.primaryActionText}>{tc("Continue")}</Text>
        </Pressable>
      </View>
    </PhoneSubPage>
  );
}

function PhoneOtpScreen() {
  const styles = useThemedStyles(createProfilePhoneScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [code, setCode] = useState("");
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline) while the code field is focused on web.
  const [isInputFocused, setInputFocused] = useState(false);
  const canSubmit = code.replace(/\D/g, "").length >= 6;

  return (
    <PhoneSubPage title={tc("Verify Phone")}>
      <Text style={styles.title}>{tc("Verification Code")}</Text>
      <View style={styles.copyBlock}>
        <Text style={styles.sectionTitle}>{tc("Enter Current Phone Number")}</Text>
        <Text style={styles.body}>{tc("We will send a verification code to confirm your number.")}</Text>
      </View>
      <View style={styles.otpPanel}>
        <PhoneIcon color={colors.primaryDark} size={28} strokeWidth={typography.iconStrokeWidth} />
        <TextInput
          accessibilityLabel={tc("Verification Code")}
          keyboardType="number-pad"
          maxLength={6}
          onBlur={() => setInputFocused(false)}
          onChangeText={setCode}
          onFocus={() => setInputFocused(true)}
          placeholder="000000"
          placeholderTextColor={colors.textSoft}
          style={[styles.otpInput, isInputFocused ? styles.inputFocused : null]}
          value={code}
        />
      </View>
      <View style={styles.actionRow}>
        <Link asChild href="/profile/verify-phone">
          <Pressable hitSlop={TAP_TARGET_HIT_SLOP} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>{tc("Back")}</Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={() => {
            // A complete 6-digit code confirms with a success cue; an incomplete
            // one gives an error cue instead of silently doing nothing.
            void (canSubmit ? haptics.success() : haptics.error());
          }}
          style={[styles.primaryAction, !canSubmit ? styles.primaryActionDisabled : null]}
        >
          <Text style={styles.primaryActionText}>{tc("Continue")}</Text>
        </Pressable>
      </View>
      <Text style={styles.resendText}>
        {tc("Please wait for 1 minute before requesting another code.")}
      </Text>
    </PhoneSubPage>
  );
}

function PhoneSubPage({ children, title }: { children: ReactNode; title: string }) {
  const styles = useThemedStyles(createProfilePhoneScreenStyles);
  const { colors } = useTheme();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={title}>
      <View style={styles.surface}>
        <Link asChild href="/profile/info">
          <Pressable accessibilityRole="link" hitSlop={TAP_TARGET_HIT_SLOP} style={styles.topBar}>
            <ChevronLeftIcon
              color={colors.accent}
              size={26}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text style={styles.topBarTitle}>{title}</Text>
          </Pressable>
        </Link>
        <KeyboardAwareScreen contentContainerStyle={styles.content}>{children}</KeyboardAwareScreen>
      </View>
    </AccountPageShell>
  );
}

function createProfilePhoneScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    marginHorizontal: -8,
    marginTop: 18,
    overflow: "hidden",
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.md,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: "#00B14F",
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "800",
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 23,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  stepLine: {
    backgroundColor: colors.border,
    height: 1,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  phoneInputRow: {
    gap: spacing.sm,
  },
  countrySelect: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  countrySelectText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    minHeight: 52,
    // Web: kill the browser's default focus ring (the OS-accent-tinted UA outline that renders
    // orange); focus is conveyed by the brand-green border (inputFocused) instead.
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  helper: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  helperError: {
    color: colors.danger,
    fontWeight: "800",
  },
  otpPanel: {
    alignItems: "center",
    backgroundColor: "#F3FBF8",
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  otpInput: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 4,
    minHeight: 58,
    // Web: kill the browser's default focus ring (the OS-accent-tinted UA outline that renders
    // orange); focus is conveyed by the brand-green border (inputFocused) instead.
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: spacing.md,
    textAlign: "center",
    width: "100%",
  },
  actionRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  primaryActionDisabled: {
    backgroundColor: colors.border,
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  resendText: {
    color: colors.danger,
    fontFamily: typography.family,
    fontSize: typography.caption,
    textAlign: "right",
  },
});
}

