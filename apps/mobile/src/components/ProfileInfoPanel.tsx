import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import {
  AlertCircle as AlertIcon,
  CheckCircle2 as SuccessIcon,
  ChevronDown,
  Edit2 as EditIcon,
  Save as SaveIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";
import { Link } from "expo-router";

import { ProfileHeroCard } from "@mobile/components/ProfileHeroCard";
import type { MobileSession } from "@mobile/auth/session";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout, webProfileInfoCashbackCard } from "@mobile/design/webDesignParity";
import { colors, radii, spacing, typography } from "@mobile/theme/tokens";

// Identity validators were too loose — passport was length-only (accepted "#@!ABC1" despite the
// "alphanumeric" copy), and birthdate was format-only (accepted "2026-13-45" and future dates).
// Exported as pure functions for unit testing (mirrors isOver20).
export function isValidPassportId(input: string): boolean {
  return /^[A-Za-z0-9]{7,15}$/.test(input.trim());
}

export function isValidBirthdate(input: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return false;
  }
  const parsed = new Date(`${input}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const [year, month, day] = input.split("-").map(Number);
  // Reject calendar roll-over (e.g. 2026-13-45 / 2000-02-30 that Date would silently normalize).
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }
  return parsed.getTime() <= now.getTime();
}

/**
 * Shared rich profile panel (web `ProfileInfo` parity). Renders, in order:
 * the `ProfileHeroCard` (avatar + name + User ID/invite copy), the cashback
 * breakdown card, and the editable personal-information section. Used by both
 * `/profile/info` (CustomerProfileDetailScreen) and `/profile` on desktop so the
 * two surfaces share one source and cannot drift.
 */
export function ProfileInfoPanel({ session }: { session: MobileSession }) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(
    typeof session.username === "string" && session.username ? session.username : "Mock User",
  );
  const [idType, setIdType] = useState<"national" | "passport">("national");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [country] = useState("");
  const [state] = useState("");
  const [city] = useState("");
  const [zip, setZip] = useState("");
  const [gender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email] = useState("mock.user@gogocash.test");
  const [phone] = useState("+66123456789");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const validateAndSave = () => {
    const nextErrors: string[] = [];
    setSuccessMsg("");

    if (!username.trim() || username.trim().length < 3) {
      nextErrors.push("Username must be at least 3 characters.");
    }

    if (idType === "national") {
      const cleaned = idNumber.replace(/\D/g, "");
      if (cleaned.length !== 13) {
        nextErrors.push("National ID must be exactly 13 digits.");
      }
    } else if (!isValidPassportId(idNumber)) {
      nextErrors.push("Passport must be between 7 and 15 alphanumeric characters.");
    }

    if (!address.trim() || address.trim().length < 10) {
      nextErrors.push("Address must be at least 10 characters.");
    }

    if (zip.replace(/\D/g, "").length !== 5) {
      nextErrors.push("Zip Code must be exactly 5 digits.");
    }

    if (!isValidBirthdate(birthdate)) {
      nextErrors.push("Birthdate must be in YYYY-MM-DD format.");
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      // Error haptic on the validation-rejection branch (cosmetic, never throws).
      void haptics.error();
      return;
    }

    setErrors([]);
    setSuccessMsg("Personal information updated successfully!");
    setIsEditing(false);
    // Success haptic on a clean save (cosmetic, never throws).
    void haptics.success();
  };

  return (
    <>
      <ProfileHeroCard session={session} />
      <ProfileCashbackSummaryCard />
      <ProfilePersonalInformationPanel
        address={address}
        birthdate={birthdate}
        city={city}
        country={country}
        email={email}
        errors={errors}
        gender={gender}
        idNumber={idNumber}
        idType={idType}
        isEditing={isEditing}
        onEditOrSave={() => {
          if (isEditing) {
            validateAndSave();
          } else {
            setIsEditing(true);
            setSuccessMsg("");
          }
        }}
        phone={phone}
        setAddress={setAddress}
        setBirthdate={setBirthdate}
        setIdNumber={setIdNumber}
        setIdType={setIdType}
        setUsername={setUsername}
        setZip={setZip}
        state={state}
        successMsg={successMsg}
        username={username}
        zip={zip}
      />
    </>
  );
}

function ProfileCashbackSummaryCard() {
  const tc = useCopy();
  return (
    <View style={styles.profileCashbackCard}>
      <View style={styles.profileCashbackTop}>
        <View style={styles.profileCashbackHeader}>
          <View style={styles.profileCashbackIconBubble}>
            <WalletIcon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
          </View>
          <View style={styles.profileCashbackTitleCopy}>
            <Text style={styles.profileCashbackTitle}>{tc(webProfileInfoCashbackCard.title)}</Text>
            <Text style={styles.profileCashbackHint}>{tc(webProfileInfoCashbackCard.hint)}</Text>
          </View>
          <Link asChild href="/withdraw">
            <Pressable style={styles.profileCashbackWithdrawButton}>
              <Text style={styles.profileCashbackWithdrawText}>
                {tc(webProfileInfoCashbackCard.actionLabel)}
              </Text>
            </Pressable>
          </Link>
        </View>
        <View
          accessibilityLabel={tc("AVAILABLE TO WITHDRAW")}
          style={styles.profileCashbackAvailableBox}
        >
          <Text style={styles.profileCashbackAvailableLabel}>
            {tc(webProfileInfoCashbackCard.availableLabel)}
          </Text>
          <View style={styles.profileCashbackAvailableAmountRow}>
            <Text style={styles.profileCashbackAvailableAmount}>
              {webProfileInfoCashbackCard.amount}
            </Text>
            <Text style={styles.profileCashbackCurrencyPill}>
              {webProfileInfoCashbackCard.currency}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.profileCashbackBreakdown}>
        <Text style={styles.profileCashbackBreakdownTitle}>
          {tc(webProfileInfoCashbackCard.breakdownTitle)}
        </Text>
        {webProfileInfoCashbackCard.rows.map((row) => (
          <View key={row.label} style={styles.profileCashbackBreakdownRow}>
            <View style={styles.profileCashbackBreakdownCopy}>
              <Text style={styles.profileCashbackBreakdownLabel}>{tc(row.label)}</Text>
              <Text style={styles.profileCashbackBreakdownSubtitle}>{tc(row.subtitle)}</Text>
            </View>
            <View style={styles.profileCashbackBreakdownAmountWrap}>
              <Text style={styles.profileCashbackBreakdownAmount}>{row.amount}</Text>
              <Text style={styles.profileCashbackBreakdownCurrency}>
                {webProfileInfoCashbackCard.currency}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfilePersonalInformationPanel({
  address,
  birthdate,
  city,
  country,
  email,
  errors,
  gender,
  idNumber,
  idType,
  isEditing,
  onEditOrSave,
  phone,
  setAddress,
  setBirthdate,
  setIdNumber,
  setIdType,
  setUsername,
  setZip,
  state,
  successMsg,
  username,
  zip,
}: {
  address: string;
  birthdate: string;
  city: string;
  country: string;
  email: string;
  errors: readonly string[];
  gender: string;
  idNumber: string;
  idType: "national" | "passport";
  isEditing: boolean;
  onEditOrSave: () => void;
  phone: string;
  setAddress: (value: string) => void;
  setBirthdate: (value: string) => void;
  setIdNumber: (value: string) => void;
  setIdType: (value: "national" | "passport") => void;
  setUsername: (value: string) => void;
  setZip: (value: string) => void;
  state: string;
  successMsg: string;
  username: string;
  zip: string;
}) {
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const cellStyle = isDesktop ? styles.gridCellHalf : styles.gridCellFull;
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <View style={styles.personalInfoPanel}>
      <View style={styles.headerRow}>
        <Text style={styles.infoTitle}>{tc("Personal Information")}</Text>
        <Pressable
          onPress={onEditOrSave}
          style={[styles.editBtn, isEditing ? styles.saveBtnActive : styles.editBtnActive]}
        >
          <Text
            style={[
              styles.editBtnText,
              isEditing ? styles.saveBtnTextActive : styles.editBtnTextActive,
            ]}
          >
            {isEditing ? tc("Save") : tc("Edit")}
          </Text>
          {isEditing ? (
            <SaveIcon color={colors.white} size={14} />
          ) : (
            <EditIcon color={colors.primary} size={14} />
          )}
        </Pressable>
      </View>

      {errors.length > 0 ? (
        <View style={styles.errorBanner}>
          <AlertIcon color={colors.danger} size={18} />
          <View style={styles.errorContent}>
            {errors.map((error) => (
              <Text key={error} style={styles.errorText}>
                {"- "}
                {tc(error)}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {successMsg ? (
        <View style={styles.successBanner}>
          <SuccessIcon color={colors.primaryDark} size={18} />
          <Text style={styles.successText}>{tc(successMsg)}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        {/* Name — placeholder-only input, no label, no icon */}
        <View style={styles.inputBox}>
          <TextInput
            editable={isEditing}
            onBlur={() => setFocusedField(null)}
            onChangeText={setUsername}
            onFocus={() => setFocusedField("name")}
            placeholder={tc("Name")}
            placeholderTextColor={FIELD_PLACEHOLDER}
            style={[styles.textInput, focusedField === "name" ? styles.textInputFocused : null]}
            value={username}
          />
        </View>

        {/* National ID / Passport ID radio row */}
        <View style={styles.idTypeRow}>
          <Pressable
            disabled={!isEditing}
            onPress={() => setIdType("national")}
            style={styles.idTypeBtn}
          >
            <View style={[styles.radioOuter, idType === "national" && styles.radioOuterActive]}>
              {idType === "national" ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={styles.idTypeBtnText}>{tc("National ID")}</Text>
          </Pressable>
          <Pressable
            disabled={!isEditing}
            onPress={() => setIdType("passport")}
            style={styles.idTypeBtn}
          >
            <View style={[styles.radioOuter, idType === "passport" && styles.radioOuterActive]}>
              {idType === "passport" ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={styles.idTypeBtnText}>{tc("Passport ID")}</Text>
          </Pressable>
        </View>

        {/* Citizen or Passport ID — placeholder-only input */}
        <View style={styles.inputBox}>
          <TextInput
            editable={isEditing}
            onBlur={() => setFocusedField(null)}
            onChangeText={setIdNumber}
            onFocus={() => setFocusedField("id")}
            placeholder={tc("Citizen or Passport ID")}
            placeholderTextColor={FIELD_PLACEHOLDER}
            style={[styles.textInput, focusedField === "id" ? styles.textInputFocused : null]}
            value={idNumber}
          />
        </View>

        {/* Legal Address — placeholder-only input */}
        <View style={styles.inputBox}>
          <TextInput
            editable={isEditing}
            onBlur={() => setFocusedField(null)}
            onChangeText={setAddress}
            onFocus={() => setFocusedField("address")}
            placeholder={tc("Legal Address")}
            placeholderTextColor={FIELD_PLACEHOLDER}
            style={[styles.textInput, focusedField === "address" ? styles.textInputFocused : null]}
            value={address}
          />
        </View>

        {/* Country & region grouped box */}
        <View style={styles.regionSection}>
          <Text style={styles.regionHeading}>{tc("Country & region")}</Text>
          <View style={styles.regionBox}>
            <View style={styles.regionGrid}>
              <View style={[styles.regionCell, cellStyle]}>
                <Text style={styles.regionLabel}>{tc("Country")}</Text>
                <ProfileDropdownDisplay placeholder={tc("Country")} value={country} />
              </View>
              <View style={[styles.regionCell, cellStyle]}>
                <Text style={styles.regionLabel}>{tc("State")}</Text>
                <ProfileDropdownDisplay placeholder={tc("State")} value={state} />
              </View>
              <View style={[styles.regionCell, cellStyle]}>
                <Text style={styles.regionLabel}>{tc("City")}</Text>
                <ProfileDropdownDisplay placeholder={tc("City")} value={city} />
              </View>
              <View style={[styles.regionCell, cellStyle]}>
                <Text style={styles.regionLabel}>{tc("Zip Code")}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    editable={isEditing}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setZip}
                    onFocus={() => setFocusedField("zip")}
                    placeholder={tc("Zip Code")}
                    placeholderTextColor={FIELD_PLACEHOLDER}
                    style={[styles.textInput, focusedField === "zip" ? styles.textInputFocused : null]}
                    value={zip}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Link Email / Link Phone Number */}
        <View style={styles.linkGrid}>
          <View style={[styles.linkCell, cellStyle]}>
            <Link asChild href="/profile/info">
              <Text style={styles.linkText}>{tc("Link Email")}</Text>
            </Link>
            <View style={styles.inputBox}>
              <TextInput
                editable={false}
                placeholder={tc("Email")}
                placeholderTextColor={FIELD_PLACEHOLDER}
                style={styles.textInput}
                value={email}
              />
            </View>
          </View>
          <View style={[styles.linkCell, cellStyle]}>
            <Link asChild href="/profile/verify-phone">
              <Text style={styles.linkText}>{tc("Link Phone Number")}</Text>
            </Link>
            <View style={styles.inputBox}>
              <TextInput
                editable={false}
                placeholder={tc("Phone Number")}
                placeholderTextColor={FIELD_PLACEHOLDER}
                style={styles.textInput}
                value={phone}
              />
            </View>
          </View>
        </View>

        {/* Gender / Birthdate */}
        <View style={styles.linkGrid}>
          <View style={cellStyle}>
            <ProfileDropdownDisplay placeholder={tc("Gender (Optional)")} value={gender} />
          </View>
          <View style={cellStyle}>
            <View style={styles.inputBox}>
              <TextInput
                editable={isEditing}
                onBlur={() => setFocusedField(null)}
                onChangeText={setBirthdate}
                onFocus={() => setFocusedField("birthdate")}
                placeholder={tc("YYYY-MM-DD")}
                placeholderTextColor={FIELD_PLACEHOLDER}
                style={[styles.textInput, focusedField === "birthdate" ? styles.textInputFocused : null]}
                value={birthdate}
              />
            </View>
          </View>
        </View>

        <Text style={styles.privacyDisclaimer}>
          {tc(
            "We use this information only to verify your identity and process withdrawals, as described in our Privacy Policy.",
          )}
        </Text>
      </View>
    </View>
  );
}

function ProfileDropdownDisplay({ placeholder, value }: { placeholder: string; value: string }) {
  return (
    <View style={styles.dropdownBox}>
      <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
        {value || placeholder}
      </Text>
      <ChevronDown color={colors.muted} size={20} />
    </View>
  );
}

const FIELD_PLACEHOLDER = "#7F7F7F";

const styles = StyleSheet.create({
  profileCashbackCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileCashbackTop: {
    backgroundColor: "#F3FCF9",
    borderBottomColor: "#E8F5EF",
    borderBottomWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  profileCashbackHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  profileCashbackIconBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "#D1FAE5",
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 2px 8px rgba(16,53,34,0.08)",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  profileCashbackTitleCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  profileCashbackTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
  profileCashbackHint: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  profileCashbackWithdrawButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 22,
  },
  profileCashbackWithdrawText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  profileCashbackAvailableBox: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(209,250,229,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileCashbackAvailableLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
  },
  profileCashbackAvailableAmountRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 4,
  },
  profileCashbackAvailableAmount: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: 0,
  },
  profileCashbackCurrencyPill: {
    backgroundColor: "#E7F8EE",
    borderRadius: radii.chip,
    color: "#0F5132",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  profileCashbackBreakdown: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  profileCashbackBreakdownTitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
  },
  profileCashbackBreakdownRow: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderColor: "#F0F0F0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  profileCashbackBreakdownCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  profileCashbackBreakdownLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  profileCashbackBreakdownSubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
  },
  profileCashbackBreakdownAmountWrap: {
    alignItems: "flex-end",
  },
  profileCashbackBreakdownAmount: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  profileCashbackBreakdownCurrency: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
  },
  personalInfoPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  infoTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "500",
  },
  editBtn: {
    alignItems: "center",
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: 6,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  editBtnActive: {
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderWidth: 1,
  },
  saveBtnActive: {
    backgroundColor: colors.primaryDark,
  },
  editBtnText: {
    fontFamily: typography.family,
    fontSize: 12,
  },
  editBtnTextActive: {
    color: colors.primary,
    fontWeight: "500",
  },
  saveBtnTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  formCard: {
    gap: spacing.lg,
  },
  inputBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "rgba(152,152,152,0.4)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  textInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    minHeight: 52,
    outlineColor: "transparent",
    outlineWidth: 0,
  },
  textInputFocused: {
    borderColor: colors.primary,
  },
  idTypeRow: {
    flexDirection: "row",
    gap: 40,
  },
  idTypeBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 28,
  },
  radioOuter: {
    alignItems: "center",
    borderColor: colors.textSoft,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioOuterActive: {
    borderColor: colors.primaryDark,
  },
  radioInner: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    height: 12,
    width: 12,
  },
  idTypeBtnText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
  },
  regionSection: {
    gap: 12,
  },
  regionHeading: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  regionBox: {
    backgroundColor: "#FAFAFA",
    borderColor: "#E4E4E4",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  regionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.lg,
    rowGap: spacing.lg,
  },
  regionCell: {
    gap: 6,
    minWidth: 0,
  },
  gridCellFull: {
    width: "100%",
  },
  gridCellHalf: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
  },
  regionLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "rgba(152,152,152,0.4)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: "#7F7F7F",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
  },
  linkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: spacing.md,
  },
  linkCell: {
    gap: 4,
  },
  linkText: {
    color: "#0064D6",
    fontFamily: typography.family,
    fontSize: 14,
    textAlign: "right",
  },
  privacyDisclaimer: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: "rgba(205,13,13,0.06)",
    borderColor: "rgba(205,13,13,0.2)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: spacing.md,
  },
  errorContent: {
    flex: 1,
    gap: 4,
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "500",
  },
  successBanner: {
    alignItems: "center",
    backgroundColor: "rgba(0,170,128,0.06)",
    borderColor: "rgba(0,170,128,0.2)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: spacing.md,
  },
  successText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
});
