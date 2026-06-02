import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  ShieldCheck as ShieldCheckIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { useCopy } from "@mobile/i18n/useCopy";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const pdpaAgeVerifyTitle = "Age verification";
const pdpaAgeVerifyBody =
  "To meet PDPA requirements and unlock the full service, enter your birth date below. You must be over 20 years old to continue.";
const pdpaAgeVerifyPlaceholder = "Birth date";
const pdpaAgeVerifySubmit = "Verify";
const pdpaAgeVerifyHint =
  "Use your real birth date. Access is available only for users over 20 years old.";
const pdpaAgeVerifySuccess = "Verification complete";
const pdpaAgeVerifyIncompleteCode = "Please enter your birth date, then tap Verify.";
const pdpaAgeVerifyUnder20 = "You must be over 20 years old to continue.";

export function isOver20(dateInput: string, now = new Date()) {
  const dob = new Date(dateInput);

  if (Number.isNaN(dob.getTime())) {
    return false;
  }

  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age > 20;
}

export function CustomerAgeVerificationScreen() {
  const tc = useCopy();
  const [birthDate, setBirthDate] = useState("");
  const [message, setMessage] = useState(pdpaAgeVerifyHint);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  const submit = () => {
    if (!birthDate.trim()) {
      setStatus("error");
      setMessage(pdpaAgeVerifyIncompleteCode);
      return;
    }

    if (!isOver20(birthDate)) {
      setStatus("error");
      setMessage(pdpaAgeVerifyUnder20);
      return;
    }

    setStatus("success");
    setMessage(pdpaAgeVerifySuccess);
  };

  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(pdpaAgeVerifyTitle)}>
      <View style={styles.surface}>
        <Link asChild href="/profile">
          <Pressable accessibilityRole="link" style={styles.topBar}>
            <ChevronLeftIcon
              color={colors.accent}
              size={26}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text style={styles.topBarTitle}>{tc(pdpaAgeVerifyTitle)}</Text>
          </Pressable>
        </Link>

        <View accessibilityLabel={tc(pdpaAgeVerifyTitle)} style={styles.card}>
          <View style={styles.iconFrame}>
            <ShieldCheckIcon
              color={colors.primaryDark}
              size={30}
              strokeWidth={typography.iconStrokeWidth}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{tc(pdpaAgeVerifyTitle)}</Text>
            <Text style={styles.body}>{tc(pdpaAgeVerifyBody)}</Text>
          </View>
          <View style={styles.formRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{tc(pdpaAgeVerifyPlaceholder)}</Text>
              <TextInput
                accessibilityLabel={tc(pdpaAgeVerifyPlaceholder)}
                onChangeText={setBirthDate}
                onSubmitEditing={submit}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={birthDate}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={status === "success"}
              onPress={submit}
              style={[
                styles.submitButton,
                status === "success" ? styles.submitButtonSuccess : null,
              ]}
            >
              <Text style={styles.submitText}>
                {tc(status === "success" ? pdpaAgeVerifySuccess : pdpaAgeVerifySubmit)}
              </Text>
            </Pressable>
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.hint,
              status === "error" ? styles.hintError : null,
              status === "success" ? styles.hintSuccess : null,
            ]}
          >
            {tc(message)}
          </Text>
        </View>
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
  card: {
    backgroundColor: "#F6FBF9",
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconFrame: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
  },
  body: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 23,
  },
  formRow: {
    gap: spacing.md,
  },
  inputWrap: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  submitButtonSuccess: {
    backgroundColor: colors.accent,
  },
  submitText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  hint: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  hintError: {
    color: colors.danger,
    fontWeight: "700",
  },
  hintSuccess: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
