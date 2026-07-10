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

import { resolveProfileCashbackBreakdownRows } from "@mobile/account/resolveProfileWalletAmount";
import { useProfileWalletAmount } from "@mobile/account/useProfileWalletAmount";
import { BirthDateField } from "@mobile/components/BirthDateField";
import { ProfileHeroCard } from "@mobile/components/ProfileHeroCard";
import { getMobileEnv } from "@mobile/config/env";
import {
  ProfileSocialBrandIcon,
  type ProfileSocialBrand,
} from "@mobile/components/ProfileSocialBrandIcons";
import type { MobileSession } from "@mobile/auth/session";
import { haptics } from "@mobile/lib/haptics";
import { parseDmyDate } from "@mobile/lib/birthdate";
import { useCopy } from "@mobile/i18n/useCopy";
import { useToast } from "@mobile/hooks/useToast";
import { mobileShellLayout, webProfileInfoCashbackCard } from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing, typography } from "@mobile/theme/tokens";

// Identity validators were too loose — passport was length-only (accepted "#@!ABC1" despite the
// "alphanumeric" copy), and birthdate was format-only (accepted "45-13-2026" and future dates).
// Exported as pure functions for unit testing (mirrors isOver20).
export function isValidPassportId(input: string): boolean {
  return /^[A-Za-z0-9]{7,15}$/.test(input.trim());
}

// Birthdate is entered as DD-MM-YYYY (Thai-locale format). parseDmyDate handles the strict format +
// calendar-roll-over rejection; here we only add the "not in the future" rule.
export function isValidBirthdate(input: string, now: Date = new Date()): boolean {
  const parsed = parseDmyDate(input);
  if (!parsed) {
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
      nextErrors.push("Birthdate must be in DD-MM-YYYY format.");
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
      <ProfileMyCashbackLinkSection />
      <ProfileSocialLinkSection />
    </>
  );
}

// Web parity (ProfileDesktopPersonalPanel): the linked MyCashBack account(s) below the
// personal form. Mock-data app → a single linked account shown masked, like the web demo.
const PROFILE_LINKED_MYCASHBACK = [{ id: "mc-5678", masked: "***5678" }] as const;

const PROFILE_SOCIAL_PROVIDERS: { brand: ProfileSocialBrand; label: string }[] = [
  { brand: "google", label: "Link with Gmail" },
  { brand: "facebook", label: "Link with Facebook" },
  { brand: "line", label: "Link with Line" },
  { brand: "x", label: "Link with X" },
  { brand: "telegram", label: "Link with Telegram" },
  { brand: "apple", label: "Link with Apple" },
];

/**
 * "Have you ever had an account(s) with MyCashBack?" — link/unlink block (web parity).
 * Linking routes to /link-mycashback; unlink is a placeholder (toast) like the web demo.
 */
function ProfileMyCashbackLinkSection() {
  const styles = useThemedStyles(createProfileInfoPanelStyles);
  const tc = useCopy();
  const toast = useToast();
  return (
    <View style={styles.linkSectionCard}>
      <View style={styles.myCashbackHeaderRow}>
        <Text style={styles.myCashbackQuestion}>
          {tc("Have you ever had an account(s) with MyCashBack?")}
        </Text>
        <Link asChild href="/link-mycashback">
          <Pressable accessibilityRole="link" style={styles.linkInline}>
            <Text style={styles.myCashbackLinkCta}>{tc("Link your account here !!")}</Text>
          </Pressable>
        </Link>
      </View>
      <Text style={styles.myCashbackDescription}>
        {tc(
          "For users with multiple MyCashBack accounts, you may link all of them to your GoGoCash profile here to manage your balances and activities from one centralized location.",
        )}
      </Text>
      {PROFILE_LINKED_MYCASHBACK.map((account) => (
        <View key={account.id} style={styles.linkedAccountRow}>
          <View style={styles.linkedAccountInfo}>
            <Text numberOfLines={1} style={styles.linkedAccountName}>
              MyCashBack
            </Text>
            <Text numberOfLines={1} style={styles.linkedAccountMasked}>
              {account.masked}
            </Text>
          </View>
          <View style={styles.linkedAccountActions}>
            <View style={styles.linkedPill}>
              <Text style={styles.linkedPillText}>{tc("Linked")}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => toast.show(tc("This sign-in method is not available yet."))}
              style={styles.linkInline}
            >
              <Text style={styles.unlinkText}>{tc("Unlink")}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * "Link to your Social Media for Easy in One-click!" — one row per provider with the brand
 * mark + a green Link pill. Linking is a placeholder (toast) like the web demo. 2-col on desktop.
 */
function ProfileSocialLinkSection() {
  const styles = useThemedStyles(createProfileInfoPanelStyles);
  const tc = useCopy();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  return (
    <View style={styles.linkSectionCard}>
      <Text style={styles.socialHeading}>
        {tc("Link to your Social Media for Easy in One-click!")}
      </Text>
      <View style={styles.socialGrid}>
        {PROFILE_SOCIAL_PROVIDERS.map((provider) => (
          <View
            key={provider.brand}
            style={[styles.socialRow, isDesktop ? styles.socialRowDesktop : null]}
          >
            <View style={styles.socialRowLeft}>
              <ProfileSocialBrandIcon brand={provider.brand} />
              <Text numberOfLines={1} style={styles.socialRowLabel}>
                {tc(provider.label)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={tc(provider.label)}
              accessibilityRole="button"
              onPress={() => toast.show(tc("This sign-in method is not available yet."))}
              style={styles.socialLinkButton}
            >
              <Text style={styles.socialLinkButtonText}>{tc("Link")}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileCashbackSummaryCard() {
  const styles = useThemedStyles(createProfileInfoPanelStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isCompact = width < 560;

  // Field bug 2026-07-10: this card rendered the fixture "3,180.24 THB
  // AVAILABLE TO WITHDRAW" (and a fixture source breakdown) on a LIVE account
  // whose real balance was 0.00. Backend mode renders the same live wallet
  // resource the header/Wallet screen use; the breakdown hides until a real
  // per-source endpoint exists. Fixtures mode keeps design parity untouched.
  const accountDataSource = getMobileEnv().accountDataSource;
  const { amount: liveAmount } = useProfileWalletAmount();
  const availableAmount =
    accountDataSource === "backend" ? liveAmount : webProfileInfoCashbackCard.amount;
  const breakdownRows = resolveProfileCashbackBreakdownRows(
    accountDataSource,
    webProfileInfoCashbackCard.rows,
  );

  const withdrawButton = (
    <Link asChild href="/withdraw">
      <Pressable
        style={StyleSheet.flatten([
          styles.profileCashbackWithdrawButton,
          isCompact ? styles.profileCashbackWithdrawButtonCompact : null,
        ])}
      >
        <Text style={styles.profileCashbackWithdrawText}>
          {tc(webProfileInfoCashbackCard.actionLabel)}
        </Text>
      </Pressable>
    </Link>
  );

  return (
    <View style={styles.profileCashbackCard}>
      <View style={[styles.profileCashbackTop, isCompact ? styles.profileCashbackTopCompact : null]}>
        <View
          style={[
            styles.profileCashbackHeader,
            isCompact ? styles.profileCashbackHeaderCompact : null,
          ]}
        >
          <View style={styles.profileCashbackHeaderMain}>
            <View style={styles.profileCashbackIconBubble}>
              <WalletIcon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
            </View>
            <View style={styles.profileCashbackTitleCopy}>
              <Text style={styles.profileCashbackTitle}>{tc(webProfileInfoCashbackCard.title)}</Text>
              {!isCompact ? (
                <Text style={styles.profileCashbackHint}>{tc(webProfileInfoCashbackCard.hint)}</Text>
              ) : null}
            </View>
            {!isCompact ? withdrawButton : null}
          </View>
          {isCompact ? (
            <>
              <Text style={styles.profileCashbackHint}>{tc(webProfileInfoCashbackCard.hint)}</Text>
              {withdrawButton}
            </>
          ) : null}
        </View>
        <View
          accessibilityLabel={tc("AVAILABLE TO WITHDRAW")}
          style={[
            styles.profileCashbackAvailableBox,
            isCompact ? styles.profileCashbackAvailableBoxCompact : null,
          ]}
        >
          <Text style={styles.profileCashbackAvailableLabel}>
            {tc(webProfileInfoCashbackCard.availableLabel)}
          </Text>
          <View style={styles.profileCashbackAvailableAmountRow}>
            <Text
              style={[
                styles.profileCashbackAvailableAmount,
                isCompact ? styles.profileCashbackAvailableAmountCompact : null,
              ]}
            >
              {availableAmount}
            </Text>
            <Text style={styles.profileCashbackCurrencyPill}>
              {webProfileInfoCashbackCard.currency}
            </Text>
          </View>
        </View>
      </View>
      {breakdownRows.length === 0 ? null : (
      <View style={styles.profileCashbackBreakdown}>
        <Text style={styles.profileCashbackBreakdownTitle}>
          {tc(webProfileInfoCashbackCard.breakdownTitle)}
        </Text>
        {breakdownRows.map((row) => (
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
      )}
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
  const styles = useThemedStyles(createProfileInfoPanelStyles);
  const { colors } = useTheme();
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
        <View style={[styles.inputBox, focusedField === "name" ? styles.inputBoxFocused : null]}>
          <TextInput
            editable={isEditing}
            onBlur={() => setFocusedField(null)}
            onChangeText={setUsername}
            onFocus={() => setFocusedField("name")}
            placeholder={tc("Name")}
            placeholderTextColor={colors.muted}
            style={styles.textInput}
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
        <View style={[styles.inputBox, focusedField === "id" ? styles.inputBoxFocused : null]}>
          <TextInput
            editable={isEditing}
            onBlur={() => setFocusedField(null)}
            onChangeText={setIdNumber}
            onFocus={() => setFocusedField("id")}
            placeholder={tc("Citizen or Passport ID")}
            placeholderTextColor={colors.muted}
            style={styles.textInput}
            value={idNumber}
          />
        </View>

        {/* Legal Address — placeholder-only input */}
        <View style={[styles.inputBox, focusedField === "address" ? styles.inputBoxFocused : null]}>
          <TextInput
            editable={isEditing}
            onBlur={() => setFocusedField(null)}
            onChangeText={setAddress}
            onFocus={() => setFocusedField("address")}
            placeholder={tc("Legal Address")}
            placeholderTextColor={colors.muted}
            style={styles.textInput}
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
                <View
                  style={[styles.inputBox, focusedField === "zip" ? styles.inputBoxFocused : null]}
                >
                  <TextInput
                    editable={isEditing}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setZip}
                    onFocus={() => setFocusedField("zip")}
                    placeholder={tc("Zip Code")}
                    placeholderTextColor={colors.muted}
                    style={styles.textInput}
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
                placeholderTextColor={colors.muted}
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
                placeholderTextColor={colors.muted}
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
            <View
              style={[styles.inputBox, focusedField === "birthdate" ? styles.inputBoxFocused : null]}
            >
              <BirthDateField
                accessibilityLabel={tc("Birthdate")}
                editable={isEditing}
                onBlur={() => setFocusedField(null)}
                onChange={setBirthdate}
                onFocus={() => setFocusedField("birthdate")}
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
  const styles = useThemedStyles(createProfileInfoPanelStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.dropdownBox}>
      <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
        {value || placeholder}
      </Text>
      <ChevronDown color={colors.muted} size={20} />
    </View>
  );
}

function createProfileInfoPanelStyles(colors: ThemeColors) {
  return StyleSheet.create({
  profileCashbackCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileCashbackTop: {
    backgroundColor: pickThemed(colors, "#F3FCF9", colors.primarySoft),
    borderBottomColor: pickThemed(colors, "#E8F5EF", colors.border),
    borderBottomWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  profileCashbackTopCompact: {
    gap: spacing.md,
    padding: spacing.md,
  },
  profileCashbackHeader: {
    gap: spacing.md,
  },
  profileCashbackHeaderCompact: {
    gap: spacing.sm,
  },
  profileCashbackHeaderMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  profileCashbackIconBubble: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "rgba(255,255,255,0.82)", colors.card),
    borderColor: pickThemed(colors, "#D1FAE5", colors.border),
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
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 22,
  },
  profileCashbackWithdrawButtonCompact: {
    alignSelf: "stretch",
    width: "100%",
  },
  profileCashbackWithdrawText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  profileCashbackAvailableBox: {
    backgroundColor: pickThemed(colors, "rgba(255,255,255,0.9)", colors.card),
    borderColor: pickThemed(colors, "rgba(209,250,229,0.8)", colors.border),
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileCashbackAvailableBoxCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
  profileCashbackAvailableAmountCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  profileCashbackCurrencyPill: {
    backgroundColor: pickThemed(colors, "#E7F8EE", colors.primarySoft),
    borderRadius: radii.chip,
    color: pickThemed(colors, "#0F5132", colors.accent),
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
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
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
  // --- MyCashBack link + social link sections (web ProfileDesktopPersonalPanel parity) ---
  linkSectionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  myCashbackHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  myCashbackQuestion: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
    minWidth: 220,
  },
  linkInline: {
    // Web: suppress the orange UA focus outline (these are text/link affordances).
    outlineColor: "transparent",
    outlineWidth: 0,
  },
  myCashbackLinkCta: {
    color: colors.link,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  myCashbackDescription: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 21,
  },
  linkedAccountRow: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "column",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkedAccountInfo: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
  },
  linkedAccountName: {
    color: colors.ink,
    flexShrink: 0,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  linkedAccountMasked: {
    color: colors.muted,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    minWidth: 0,
  },
  linkedAccountActions: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    flexShrink: 0,
    gap: 12,
  },
  linkedPill: {
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  linkedPillText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
  },
  unlinkText: {
    color: colors.link,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  socialHeading: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "500",
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialRow: {
    alignItems: "center",
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 8,
    width: "100%",
  },
  socialRowDesktop: {
    width: "48%",
  },
  socialRowLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  socialRowLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  socialLinkButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 32,
    // Web: suppress the orange UA focus outline; the green pill conveys the action.
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: 18,
  },
  socialLinkButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
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
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    // Clip to the radius so the rounded corners don't rasterize "horns" under the focus layer.
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  inputBoxFocused: {
    // Focus highlights the rounded wrapper (web parity) — the green border follows the box,
    // instead of a phantom border on the square inner <TextInput>.
    borderColor: colors.primary,
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
    borderColor: colors.border,
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
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
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
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    // Clip to the radius (same fix as inputBox) so rounded corners render cleanly.
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  dropdownValue: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: colors.muted,
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
    color: colors.link,
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
}

