import { Link, useRouter } from "expo-router";
import { ChevronLeft as ChevronLeftIcon, Smartphone as PhoneIcon } from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type PhoneMode = "otp" | "phone";

export function CustomerProfilePhoneScreen({ mode }: { mode: PhoneMode }) {
  return mode === "otp" ? <PhoneOtpScreen /> : <PhoneNumberScreen />;
}

function PhoneNumberScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const normalizedPhone = phone.replace(/\D/g, "");
  const isValid = normalizedPhone.length >= 9 && normalizedPhone.length <= 10;

  const helperText = useMemo(() => {
    if (!phone) {
      return "To keep your account secure, enter the mobile phone number linked to your account.";
    }

    if (!isValid) {
      return "Invalid phone number";
    }

    return "We will send a verification code to confirm your number.";
  }, [isValid, phone]);

  return (
    <PhoneSubPage title="Verify Phone">
      <Text style={styles.title}>Change Your Phone Number</Text>
      <Text style={styles.body}>
        To keep your account secure, please enter current mobile phone number linked to your account
        before updating your phone number.
      </Text>
      <View style={styles.stepLine} />
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={styles.phoneInputRow}>
          <View style={styles.countrySelect}>
            <Text style={styles.countrySelectText}>Thailand (TH)</Text>
          </View>
          <TextInput
            accessibilityLabel="Mobile Number"
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="08x xxx xxxx"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            value={phone}
          />
        </View>
        <Text style={[styles.helper, !isValid && phone ? styles.helperError : null]}>
          {helperText}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <Link asChild href="/profile/info">
          <Pressable style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Back</Text>
          </Pressable>
        </Link>
        <Pressable
          disabled={!isValid}
          onPress={() => router.push("/profile/cf-phone")}
          style={[styles.primaryAction, !isValid ? styles.primaryActionDisabled : null]}
        >
          <Text style={styles.primaryActionText}>Continue</Text>
        </Pressable>
      </View>
    </PhoneSubPage>
  );
}

function PhoneOtpScreen() {
  const [code, setCode] = useState("");
  const canSubmit = code.replace(/\D/g, "").length >= 6;

  return (
    <PhoneSubPage title="Verify Phone">
      <Text style={styles.title}>Verification Code</Text>
      <View style={styles.copyBlock}>
        <Text style={styles.sectionTitle}>Enter Current Phone Number</Text>
        <Text style={styles.body}>We will send a verification code to confirm your number.</Text>
      </View>
      <View style={styles.otpPanel}>
        <PhoneIcon color={colors.primaryDark} size={28} strokeWidth={typography.iconStrokeWidth} />
        <TextInput
          accessibilityLabel="Verification Code"
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setCode}
          placeholder="000000"
          placeholderTextColor={colors.textSoft}
          style={styles.otpInput}
          value={code}
        />
      </View>
      <View style={styles.actionRow}>
        <Link asChild href="/profile/verify-phone">
          <Pressable style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Back</Text>
          </Pressable>
        </Link>
        <Pressable
          disabled={!canSubmit}
          style={[styles.primaryAction, !canSubmit ? styles.primaryActionDisabled : null]}
        >
          <Text style={styles.primaryActionText}>Continue</Text>
        </Pressable>
      </View>
      <Text style={styles.resendText}>
        Please wait for 1 minute before requesting another code.
      </Text>
    </PhoneSubPage>
  );
}

function PhoneSubPage({ children, title }: { children: ReactNode; title: string }) {
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={title}>
      <View style={styles.surface}>
        <Link asChild href="/profile/info">
          <Pressable accessibilityRole="link" style={styles.topBar}>
            <ChevronLeftIcon
              color={colors.accent}
              size={26}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text style={styles.topBarTitle}>{title}</Text>
          </Pressable>
        </Link>
        <View style={styles.content}>{children}</View>
      </View>
    </AccountPageShell>
  );
}

const styles = StyleSheet.create({
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
    color: colors.primaryDark,
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
    paddingHorizontal: spacing.md,
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
