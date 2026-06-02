import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle as AlertIcon,
  Calendar as DateIcon,
  CheckCircle2 as SuccessIcon,
  ChevronLeft as ChevronLeftIcon,
  Edit2 as EditIcon,
  Mail as MailIcon,
  MapPin as MapIcon,
  Phone as PhoneIcon,
  Save as SaveIcon,
  User as UserIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";

import { AccountPageShell, AccountWalletHeroCard } from "@mobile/components/AccountPageShell";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  mobileShellLayout,
  webProfileInfoCashbackCard,
  webProfileWalletSummary,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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
  const model = models[mode];

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("Kunanon Jarat");
  const [idType, setIdType] = useState<"national" | "passport">("national");
  const [idNumber, setIdNumber] = useState("1100800999999");
  const [address, setAddress] = useState("123 Sukhumvit Rd, Khlong Toei");
  const [country] = useState("Thailand");
  const [state, setState] = useState("Bangkok");
  const [city, setCity] = useState("Khlong Toei");
  const [zip, setZip] = useState("10110");
  const [gender, setGender] = useState("Male");
  const [birthdate, setBirthdate] = useState("1996-05-23");
  const [email] = useState("kunanon@gogocash.co");
  const [phone] = useState("+66 89 123 4567");
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
    } else if (idNumber.trim().length < 7 || idNumber.trim().length > 15) {
      nextErrors.push("Passport must be between 7 and 15 alphanumeric characters.");
    }

    if (!address.trim() || address.trim().length < 10) {
      nextErrors.push("Address must be at least 10 characters.");
    }

    if (zip.replace(/\D/g, "").length !== 5) {
      nextErrors.push("Zip Code must be exactly 5 digits.");
    }

    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      nextErrors.push("Birthdate must be in YYYY-MM-DD format.");
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors([]);
    setSuccessMsg("Personal information updated successfully!");
    setIsEditing(false);
  };

  if (mode === "info") {
    return (
      <ProfileInfoSubPage>
        <ProfileInfoTopBar />
        <View style={styles.profileInfoContent}>
          <AccountWalletHeroCard
            amount={webProfileWalletSummary.amount}
            currency={webProfileWalletSummary.currency}
            lastUpdated={webProfileWalletSummary.lastUpdated}
            maskedId={webProfileWalletSummary.maskedId}
            title={webProfileWalletSummary.username}
          />
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
            setCity={setCity}
            setGender={setGender}
            setIdNumber={setIdNumber}
            setIdType={setIdType}
            setState={setState}
            setUsername={setUsername}
            setZip={setZip}
            state={state}
            successMsg={successMsg}
            username={username}
            zip={zip}
          />
        </View>
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
  setCity,
  setGender,
  setIdNumber,
  setIdType,
  setState,
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
  setCity: (value: string) => void;
  setGender: (value: string) => void;
  setIdNumber: (value: string) => void;
  setIdType: (value: "national" | "passport") => void;
  setState: (value: string) => void;
  setUsername: (value: string) => void;
  setZip: (value: string) => void;
  state: string;
  successMsg: string;
  username: string;
  zip: string;
}) {
  const tc = useCopy();
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
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{tc("Name / Username")}</Text>
          <View style={[styles.inputBox, !isEditing && styles.inputBoxLocked]}>
            <UserIcon color={colors.muted} size={16} />
            <TextInput
              editable={isEditing}
              onChangeText={setUsername}
              placeholder={tc("Username")}
              placeholderTextColor={colors.textSoft}
              style={styles.textInput}
              value={username}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{tc("Identification Type")}</Text>
          <View style={styles.idTypeRow}>
            <Pressable
              disabled={!isEditing}
              onPress={() => setIdType("national")}
              style={styles.idTypeBtn}
            >
              <View style={[styles.radioOuter, idType === "national" && styles.radioOuterActive]}>
                {idType === "national" ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={[styles.idTypeBtnText, idType === "national" && styles.idTypeBtnTextActive]}>
                {tc("National ID")}
              </Text>
            </Pressable>
            <Pressable
              disabled={!isEditing}
              onPress={() => setIdType("passport")}
              style={styles.idTypeBtn}
            >
              <View style={[styles.radioOuter, idType === "passport" && styles.radioOuterActive]}>
                {idType === "passport" ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={[styles.idTypeBtnText, idType === "passport" && styles.idTypeBtnTextActive]}>
                {tc("Passport")}
              </Text>
            </Pressable>
          </View>
        </View>

        <ProfileTextField
          editable={isEditing}
          label={idType === "national" ? "National ID Number" : "Passport ID Number"}
          onChangeText={setIdNumber}
          placeholder={idType === "national" ? "13-digit ID" : "Passport ID"}
          value={idNumber}
        />
        <ProfileTextField
          editable={isEditing}
          icon={<MapIcon color={colors.muted} size={16} />}
          label="Legal Address"
          onChangeText={setAddress}
          placeholder="Legal Address"
          value={address}
        />

        <View style={styles.gridContainer}>
          <ProfileTextField editable={false} label="Country" value={country} />
          <ProfileTextField editable={isEditing} label="State" onChangeText={setState} value={state} />
        </View>
        <View style={styles.gridContainer}>
          <ProfileTextField editable={isEditing} label="City" onChangeText={setCity} value={city} />
          <ProfileTextField editable={isEditing} label="Zip Code" onChangeText={setZip} value={zip} />
        </View>

        <ProfileTextField
          editable={false}
          icon={<MailIcon color={colors.textSoft} size={16} />}
          label="Email Address"
          value={email}
        />
        <ProfileTextField
          editable={false}
          icon={<PhoneIcon color={colors.textSoft} size={16} />}
          label="Phone Number"
          value={phone}
        />

        <View style={styles.gridContainer}>
          <ProfileTextField editable={isEditing} label="Gender" onChangeText={setGender} value={gender} />
          <ProfileTextField
            editable={isEditing}
            icon={<DateIcon color={colors.muted} size={16} />}
            label="Birthdate"
            onChangeText={setBirthdate}
            placeholder="YYYY-MM-DD"
            value={birthdate}
          />
        </View>
      </View>
    </View>
  );
}

function ProfileTextField({
  editable,
  icon,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  editable: boolean;
  icon?: ReactNode;
  label: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const tc = useCopy();
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{tc(label)}</Text>
      <View style={[styles.inputBox, !editable && styles.inputBoxLocked]}>
        {icon}
        <TextInput
          editable={editable}
          onChangeText={onChangeText}
          placeholder={placeholder ? tc(placeholder) : placeholder}
          placeholderTextColor={colors.textSoft}
          style={styles.textInput}
          value={value}
        />
      </View>
    </View>
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  infoTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
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
    gap: spacing.md,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "700",
  },
  inputBox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputBoxLocked: {
    backgroundColor: "#F9F9F9",
    borderColor: colors.border,
  },
  textInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    minHeight: 48,
  },
  idTypeRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 4,
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
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
  },
  idTypeBtnTextActive: {
    color: colors.ink,
    fontWeight: "600",
  },
  gridContainer: {
    flexDirection: "row",
    gap: spacing.md,
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
