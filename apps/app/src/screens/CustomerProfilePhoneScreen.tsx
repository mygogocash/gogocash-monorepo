import { Link, useRouter } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Smartphone as PhoneIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  isOtpCodeError,
  sendErrorCopy,
  toSendErrorKind,
} from "@mobile/auth/authSendErrorKind";
import {
  isProfilePhoneLinkSupported,
  PhoneLinkError,
  linkVerifiedPhone,
} from "@mobile/auth/phoneLink";
import { toPhoneE164 } from "@mobile/auth/phoneE164";
import {
  clearProfilePhoneAttempt,
  getProfilePhoneAttempt,
  maskPhoneE164,
  setProfilePhoneAttempt,
} from "@mobile/auth/profilePhoneAttempt";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { hasUsableMobileSessionToken } from "@mobile/auth/sessionValidity";
import { useFirebasePhoneRecaptcha } from "@mobile/auth/useFirebasePhoneRecaptcha";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { getMobileEnv } from "@mobile/config/env";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { pickThemed } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

// Tap-target expansion for icon/text-only buttons shorter than the 44px minimum
// (chevron back-link + the text-only "Back" buttons). 12px on each side lifts the
// effective hit area past the threshold without changing the visual layout.
const TAP_TARGET_HIT_SLOP = {
  bottom: 12,
  left: 12,
  right: 12,
  top: 12,
} as const;

type PhoneMode = "otp" | "phone";

type OtpFlowErrorKind = "conflict" | "link" | "otp" | "session" | "system";

const OTP_FLOW_ERROR_COPY: Record<OtpFlowErrorKind, string> = {
  conflict:
    "This phone number is already linked to another account. Keep using your original sign-in method or contact support.",
  link: "We couldn't link this phone to your account. Keep using your original sign-in method and try again, or contact support.",
  otp: "That code is invalid or expired. Check the code or request a new one.",
  session:
    "Your sign-in session expired. Sign in again with your original method, then return to Profile > Verify Phone.",
  system:
    "We couldn't finish linking your phone. Please try again. Your original sign-in still works.",
};

const EXPIRED_ATTEMPT_COPY =
  "This verification attempt expired. Start phone verification again.";

const NATIVE_PHONE_LINK_UNAVAILABLE_COPY =
  "Phone verification isn't available in this app build yet. Open GoGoCash in your web browser to link your number.";

const OTP_DESTINATION_COPY = "We sent a verification code to {phone}.";

export function CustomerProfilePhoneScreen({ mode }: { mode: PhoneMode }) {
  return mode === "otp" ? <PhoneOtpScreen /> : <PhoneNumberScreen />;
}

function PhoneNumberScreen() {
  const styles = useThemedStyles(createProfilePhoneScreenStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const tc = useCopy();
  const [phone, setPhone] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const { recaptchaModal, sendPhoneOtpWithRecaptcha } =
    useFirebasePhoneRecaptcha();
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline) while the phone field is focused on web.
  const [isInputFocused, setInputFocused] = useState(false);
  const normalizedPhone = phone.replace(/\D/g, "");
  const isValid = normalizedPhone.length >= 9 && normalizedPhone.length <= 10;
  const isPhoneLinkSupported = isProfilePhoneLinkSupported(Platform.OS);

  const helperText = useMemo(() => {
    if (!isPhoneLinkSupported) {
      return tc(NATIVE_PHONE_LINK_UNAVAILABLE_COPY);
    }

    if (!phone) {
      return tc("Enter a Thai mobile number that you own.");
    }

    if (!isValid) {
      return tc("Invalid phone number");
    }

    return tc("We will send a verification code to confirm your number.");
  }, [isPhoneLinkSupported, isValid, phone, tc]);

  const handleSendCode = async () => {
    if (!isPhoneLinkSupported) {
      setSendError(tc(NATIVE_PHONE_LINK_UNAVAILABLE_COPY));
      void haptics.error();
      return;
    }

    if (!isValid || isSubmitting) {
      if (!isValid) void haptics.error();
      return;
    }

    setSendError(null);
    setSubmitting(true);
    clearProfilePhoneAttempt();

    try {
      const phoneE164 = toPhoneE164("+66", normalizedPhone);
      const confirmation = await sendPhoneOtpWithRecaptcha(phoneE164);
      setProfilePhoneAttempt({
        confirmation,
        maskedDestination: maskPhoneE164(phoneE164),
        phoneE164,
      });
      void haptics.success();
      router.push("/profile/cf-phone");
    } catch (error) {
      setSendError(tc(sendErrorCopy[toSendErrorKind(error)]));
      void haptics.error();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PhoneSubPage onExit={clearProfilePhoneAttempt} title={tc("Verify Phone")}>
      <Text style={styles.title}>{tc("Link Your Phone Number")}</Text>
      <Text style={styles.body}>
        {tc(
          "Add a verified phone number to this account. Your current sign-in method will stay connected.",
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
            onChangeText={(value) => {
              setPhone(value);
              setSendError(null);
            }}
            onFocus={() => setInputFocused(true)}
            placeholder="08x xxx xxxx"
            placeholderTextColor={colors.muted}
            style={[styles.input, isInputFocused ? styles.inputFocused : null]}
            value={phone}
          />
        </View>
        <Text
          style={[styles.helper, !isValid && phone ? styles.helperError : null]}
        >
          {helperText}
        </Text>
        {sendError ? (
          <Text
            accessibilityRole="alert"
            style={[styles.helper, styles.helperError]}
          >
            {sendError}
          </Text>
        ) : null}
      </View>
      <View style={styles.actionRow}>
        <Link asChild href="/profile/info">
          <Pressable
            hitSlop={TAP_TARGET_HIT_SLOP}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>{tc("Back")}</Text>
          </Pressable>
        </Link>
        <Pressable
          accessibilityState={{
            disabled: !isPhoneLinkSupported || !isValid || isSubmitting,
          }}
          disabled={!isPhoneLinkSupported || isSubmitting}
          onPress={() => void handleSendCode()}
          style={[
            styles.primaryAction,
            !isPhoneLinkSupported || !isValid || isSubmitting
              ? styles.primaryActionDisabled
              : null,
          ]}
        >
          <Text style={styles.primaryActionText}>
            {tc(isSubmitting ? "Sending..." : "Continue")}
          </Text>
        </Pressable>
      </View>
      {recaptchaModal}
    </PhoneSubPage>
  );
}

function PhoneOtpScreen() {
  const styles = useThemedStyles(createProfilePhoneScreenStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const tc = useCopy();
  const [attempt] = useState(() => getProfilePhoneAttempt());
  const [code, setCode] = useState("");
  const [errorKind, setErrorKind] = useState<OtpFlowErrorKind | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline) while the code field is focused on web.
  const [isInputFocused, setInputFocused] = useState(false);
  const normalizedCode = code.replace(/\D/g, "");
  const canSubmit = normalizedCode.length === 6 && !isSubmitting;

  const handleBackToPhone = () => {
    clearProfilePhoneAttempt();
    router.push("/profile/verify-phone");
  };

  const handleConfirmCode = async () => {
    if (!attempt || !canSubmit) {
      if (!canSubmit) void haptics.error();
      return;
    }

    setErrorKind(null);
    setSubmitting(true);

    try {
      const { confirmPhoneOtp } =
        await import("@mobile/auth/firebasePhoneAuth");
      const { idToken } = await confirmPhoneOtp(
        attempt.confirmation,
        normalizedCode,
      );
      const env = getMobileEnv();
      const store = await getSharedSessionStore();
      const session = await store?.getSession();

      if (
        !store ||
        !session ||
        !hasUsableMobileSessionToken(session, env.accountDataSource)
      ) {
        throw new PhoneLinkError("SESSION_REAUTH_REQUIRED");
      }

      const linked = await linkVerifiedPhone({
        apiUrl: env.apiUrl,
        backendAccessToken: String(session.access_token),
        firebaseIdToken: idToken,
      });
      await store.setSession({
        ...session,
        mobile: linked.mobile?.trim() || attempt.phoneE164,
      });
      clearProfilePhoneAttempt();
      void haptics.success();
      router.replace("/profile/info");
    } catch (error) {
      if (isOtpCodeError(error)) {
        setErrorKind("otp");
      } else if (error instanceof PhoneLinkError) {
        if (error.code === "PHONE_VERIFICATION_REQUIRED") {
          setErrorKind("otp");
        } else if (error.code === "SESSION_REAUTH_REQUIRED") {
          setErrorKind("session");
        } else if (error.code === "PHONE_ALREADY_LINKED") {
          setErrorKind("conflict");
        } else if (error.code === "PHONE_LINK_FAILED") {
          setErrorKind("link");
        } else {
          setErrorKind("system");
        }
      } else {
        setErrorKind("system");
      }
      void haptics.error();
    } finally {
      setSubmitting(false);
    }
  };

  if (!attempt) {
    return (
      <PhoneSubPage
        onExit={clearProfilePhoneAttempt}
        title={tc("Verify Phone")}
      >
        <Text style={styles.title}>{tc("Verification Code")}</Text>
        <View style={styles.copyBlock}>
          <Text
            accessibilityRole="alert"
            style={[styles.body, styles.statusMessageError]}
          >
            {tc(EXPIRED_ATTEMPT_COPY)}
          </Text>
        </View>
        <View style={[styles.actionRow, styles.singleActionRow]}>
          <Pressable onPress={handleBackToPhone} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>{tc("Start again")}</Text>
          </Pressable>
        </View>
      </PhoneSubPage>
    );
  }

  return (
    <PhoneSubPage onExit={clearProfilePhoneAttempt} title={tc("Verify Phone")}>
      <Text style={styles.title}>{tc("Verification Code")}</Text>
      <View style={styles.copyBlock}>
        <Text style={styles.sectionTitle}>{tc("Enter the code we sent")}</Text>
        <Text style={styles.body}>
          {tc(OTP_DESTINATION_COPY).replace(
            "{phone}",
            attempt.maskedDestination,
          )}
        </Text>
      </View>
      <View style={styles.otpPanel}>
        <PhoneIcon
          color={colors.primaryDark}
          size={28}
          strokeWidth={typography.iconStrokeWidth}
        />
        <TextInput
          accessibilityLabel={tc("Verification Code")}
          keyboardType="number-pad"
          maxLength={6}
          onBlur={() => setInputFocused(false)}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, "").slice(0, 6));
            setErrorKind(null);
          }}
          onFocus={() => setInputFocused(true)}
          placeholder="000000"
          placeholderTextColor={colors.muted}
          style={[styles.otpInput, isInputFocused ? styles.inputFocused : null]}
          value={code}
        />
      </View>
      {errorKind ? (
        <Text
          accessibilityRole="alert"
          style={[styles.body, styles.statusMessageError]}
        >
          {tc(OTP_FLOW_ERROR_COPY[errorKind])}
        </Text>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable
          hitSlop={TAP_TARGET_HIT_SLOP}
          onPress={handleBackToPhone}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>{tc("Back")}</Text>
        </Pressable>
        <Pressable
          accessibilityState={{ disabled: !canSubmit }}
          disabled={isSubmitting}
          onPress={() => void handleConfirmCode()}
          style={[
            styles.primaryAction,
            !canSubmit ? styles.primaryActionDisabled : null,
          ]}
        >
          <Text style={styles.primaryActionText}>
            {tc(isSubmitting ? "Linking..." : "Continue")}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.resendText}>
        {tc("Didn't receive a code? Go back and request a new one.")}
      </Text>
    </PhoneSubPage>
  );
}

function PhoneSubPage({
  children,
  onExit,
  title,
}: {
  children: ReactNode;
  onExit?: () => void;
  title: string;
}) {
  const styles = useThemedStyles(createProfilePhoneScreenStyles);
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={title}>
      <View style={styles.surface}>
        <Pressable
          accessibilityRole="link"
          hitSlop={TAP_TARGET_HIT_SLOP}
          onPress={() => {
            onExit?.();
            router.push("/profile/info");
          }}
          style={styles.topBar}
        >
          <ChevronLeftIcon
            color={colors.accent}
            size={26}
            strokeWidth={typography.iconStrokeWidth}
          />
          <Text style={styles.topBarTitle}>{title}</Text>
        </Pressable>
        <KeyboardAwareScreen contentContainerStyle={styles.content}>
          {children}
        </KeyboardAwareScreen>
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
      color: pickThemed(colors, "#00B14F", colors.primary),
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
      backgroundColor: pickThemed(colors, "#F3FBF8", colors.primarySoft),
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
    singleActionRow: {
      justifyContent: "flex-end",
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
    statusMessageError: {
      color: colors.danger,
      fontWeight: "700",
    },
  });
}
