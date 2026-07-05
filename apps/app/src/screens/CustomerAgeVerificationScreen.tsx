import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  ShieldCheck as ShieldCheckIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { BirthDateField } from "@mobile/components/BirthDateField";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import { parseDmyDate } from "@mobile/lib/birthdate";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import {
  premiumOutlineButtonDisabledStyle,
  premiumOutlineButtonStyle,
  premiumOutlineButtonTextStyle,
} from "@mobile/theme/premiumPanelCard";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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
  // Birth date is entered as DD-MM-YYYY (Thai-locale format); parseDmyDate rejects malformed/impossible
  // dates. Age is computed in UTC to match the parsed UTC date and stay timezone-deterministic.
  const dob = parseDmyDate(dateInput);

  if (!dob) {
    return false;
  }

  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() >= dob.getUTCDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age > 20;
}

export function CustomerAgeVerificationScreen() {
  const styles = useThemedStyles(createAgeVerificationScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const [birthDate, setBirthDate] = useState("");
  const [message, setMessage] = useState(pdpaAgeVerifyHint);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  // Swap the resting border for a brand-green focus ring (and suppress the orange OS-accent UA
  // outline). One flag suffices: this screen has a single editable input.
  const [isInputFocused, setInputFocused] = useState(false);

  const submit = () => {
    if (!birthDate.trim()) {
      setStatus("error");
      setMessage(pdpaAgeVerifyIncompleteCode);
      void haptics.error();
      return;
    }

    if (!isOver20(birthDate)) {
      setStatus("error");
      setMessage(pdpaAgeVerifyUnder20);
      void haptics.error();
      return;
    }

    setStatus("success");
    setMessage(pdpaAgeVerifySuccess);
    void haptics.success();
  };

  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(pdpaAgeVerifyTitle)}>
      <KeyboardAwareScreen>
        <View style={styles.surface}>
          {/* Mobile-only back link — on desktop the persistent sidebar handles navigation
              (web parity: the SubPage topbar is md:hidden). */}
          {isDesktop ? null : (
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
          )}

          <View accessibilityLabel={tc(pdpaAgeVerifyTitle)} style={styles.card}>
            <View style={styles.iconFrame}>
              <ShieldCheckIcon
                color={colors.white}
                size={28}
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
                <View style={[styles.input, isInputFocused ? styles.inputFocused : null]}>
                  <BirthDateField
                    accessibilityLabel={tc(pdpaAgeVerifyPlaceholder)}
                    onBlur={() => setInputFocused(false)}
                    onChange={setBirthDate}
                    onFocus={() => setInputFocused(true)}
                    value={birthDate}
                  />
                </View>
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
      </KeyboardAwareScreen>
    </AccountPageShell>
  );
}

function createAgeVerificationScreenStyles(colors: ThemeColors) {
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
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconFrame: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
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
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: pickThemed(colors, colors.fieldMuted, colors.field),
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    minHeight: 48,
    // Web: suppress the orange OS-accent UA focus outline; focus is conveyed by the green border.
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  submitButton: premiumOutlineButtonStyle(colors),
  submitButtonSuccess: premiumOutlineButtonDisabledStyle(colors),
  submitText: premiumOutlineButtonTextStyle(colors),
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
}

