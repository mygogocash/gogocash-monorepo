import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Landmark as BankIcon,
  Smartphone as PhoneIcon,
  Wallet as CryptoIcon,
  Plus as PlusIcon,
  Save as SaveIcon,
  AlertCircle as AlertIcon,
  CheckCircle2 as SuccessIcon,
  Coins as CoinIcon,
} from "@mobile/theme/icons";

import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { colors, radii, spacing, typography, shadows } from "@mobile/theme/tokens";

type MoneyActionMode = "method" | "methodCreate" | "myCashback" | "withdraw";

// Bug-hunt fixes (#1, #2): parse the withdrawal amount by stripping thousands separators and rejecting
// junk — raw parseFloat turned "1,500.00" into 1 and "500abc" into 500. `evaluateWithdraw` is a pure
// decision shared by the submit handler and the button's disabled state so a second tap can't
// double-deduct after a successful submission.
export function parseWithdrawAmount(input: string): number {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return Number.NaN;
  }
  return Number.parseFloat(cleaned);
}

export type WithdrawDecision = { ok: true; amount: number } | { ok: false; error: string | null };

export function evaluateWithdraw(
  input: string,
  balance: number,
  hasMethod: boolean,
  alreadySubmitted: boolean
): WithdrawDecision {
  if (alreadySubmitted) {
    return { ok: false, error: null };
  }
  const amount = parseWithdrawAmount(input);
  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, error: "Please enter a valid withdrawal amount." };
  }
  if (amount > balance) {
    return { ok: false, error: "Insufficient available balance." };
  }
  if (!hasMethod) {
    return { ok: false, error: "Select a payout method before confirming withdrawal." };
  }
  return { ok: true, amount };
}

// Initial local payout methods state
type PayoutMethod = {
  id: string;
  type: "promptpay" | "bank" | "crypto";
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
};

const INITIAL_METHODS: PayoutMethod[] = [
  {
    id: "1",
    type: "promptpay",
    bankName: "PromptPay (Phone)",
    accountNo: "0891234567",
    accountName: "Kunanon Jarat",
    isDefault: true,
  },
  {
    id: "2",
    type: "bank",
    bankName: "Kasikorn Bank",
    accountNo: "123-4-56789-0",
    accountName: "Kunanon Jarat",
    isDefault: false,
  },
];

export function CustomerMoneyActionScreen({ mode }: { mode: MoneyActionMode }) {
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Local state for interactive flows
  const [methods, setMethods] = useState<PayoutMethod[]>(INITIAL_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState("1");
  const [withdrawAmount, setWithdrawAmount] = useState("500.00");
  const [balance, setBalance] = useState(3180.24);

  // Form states (methodCreate)
  const [createTab, setCreateTab] = useState<"promptpay" | "bank" | "crypto">("bank");
  const [ppIdType, setPpIdType] = useState<"phone" | "citizen">("phone");
  const [ppCode, setPpCode] = useState("");
  const [ppThaiName, setPpThaiName] = useState("");
  const [ppEnglishName, setPpEnglishName] = useState("");
  const [ppIsDefault, setPpIsDefault] = useState(false);

  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankIsDefault, setBankIsDefault] = useState(false);

  const [cryptoAddress, setCryptoAddress] = useState("");
  const [cryptoIsDefault, setCryptoIsDefault] = useState(false);

  // Notifications
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  // Web: track which editable input has focus so we can swap its wrapper border to brand green
  // (and suppress the orange OS-accent UA outline). Keyed per field since several inputs coexist.
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const selectedMethod = methods.find((m) => m.id === selectedMethodId);

  const handleSaveMethod = () => {
    const errs: string[] = [];
    setSuccessMsg("");

    let newMethod: PayoutMethod | null = null;

    if (createTab === "promptpay") {
      if (!ppCode.trim()) errs.push(tc("PromptPay phone/ID is required."));
      if (!ppThaiName.trim()) errs.push(tc("Thai owner name is required."));
      if (!ppEnglishName.trim()) errs.push(tc("English owner name is required."));

      if (ppIdType === "phone" && ppCode.replace(/\D/g, "").length < 9) {
        errs.push(tc("PromptPay phone must be at least 9 digits."));
      }
      if (ppIdType === "citizen" && ppCode.replace(/\D/g, "").length !== 13) {
        errs.push(tc("PromptPay Citizen ID must be exactly 13 digits."));
      }

      if (errs.length === 0) {
        newMethod = {
          id: Math.random().toString(),
          type: "promptpay",
          bankName: `PromptPay (${ppIdType === "phone" ? "Phone" : "Citizen ID"})`,
          accountNo: ppCode.trim(),
          accountName: `${ppThaiName.trim()} | ${ppEnglishName.trim()}`,
          isDefault: ppIsDefault,
        };
      }
    } else if (createTab === "bank") {
      if (!bankName.trim()) errs.push(tc("Bank selection is required."));
      if (!bankAccountNo.trim()) errs.push(tc("Account number is required."));
      if (!bankAccountName.trim()) errs.push(tc("Account name is required."));

      if (errs.length === 0) {
        newMethod = {
          id: Math.random().toString(),
          type: "bank",
          bankName,
          accountNo: bankAccountNo.trim(),
          accountName: bankAccountName.trim(),
          isDefault: bankIsDefault,
        };
      }
    } else if (createTab === "crypto") {
      if (!cryptoAddress.trim()) errs.push(tc("Crypto wallet address is required."));

      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      if (cryptoAddress.trim() && !ethRegex.test(cryptoAddress.trim())) {
        errs.push(tc("Must be a valid EVM address (e.g. 0x followed by 40 hex characters)."));
      }

      if (errs.length === 0) {
        newMethod = {
          id: Math.random().toString(),
          type: "crypto",
          bankName: "Crypto Wallet",
          accountNo: cryptoAddress.trim(),
          accountName: "Crypto Wallet",
          isDefault: cryptoIsDefault,
        };
      }
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    if (newMethod) {
      // Adjust defaults
      let updatedMethods = [...methods];
      if (newMethod.isDefault) {
        updatedMethods = updatedMethods.map((m) => ({ ...m, isDefault: false }));
      }
      updatedMethods.push(newMethod);
      setMethods(updatedMethods);
      setSuccessMsg(tc("Payout method saved successfully!"));
      setErrors([]);

      // Clear form
      setPpCode("");
      setPpThaiName("");
      setPpEnglishName("");
      setBankName("");
      setBankAccountNo("");
      setBankAccountName("");
      setCryptoAddress("");

      setTimeout(() => {
        router.push("/method");
      }, 1000);
    }
  };

  const handleWithdraw = () => {
    const decision = evaluateWithdraw(withdrawAmount, balance, !!selectedMethod, !!successMsg);
    if (!decision.ok) {
      // error === null means "already submitted" — silently ignore the repeat tap (no buzz).
      if (decision.error) {
        // Error buzz on a rejected attempt (invalid amount / insufficient / no method).
        haptics.error();
        setErrors([tc(decision.error)]);
      }
      return;
    }
    if (!selectedMethod) {
      return;
    }

    // Success haptic on a confirmed withdrawal, then commit the deduction + receipt.
    haptics.success();
    setErrors([]);
    setBalance(balance - decision.amount);
    setSuccessMsg(
      `Cashback withdrawal of ${decision.amount.toFixed(2)} THB to ${selectedMethod.bankName} submitted successfully!`
    );
  };

  return (
    <View style={styles.viewport}>
      <View style={styles.phoneFrame}>
        {/* A4 — KeyboardAwareScreen replaces the plain ScrollView so the numeric keyboard on the
            withdrawal-amount / method forms pushes content up instead of covering the focused
            field. It provides its own keyboard-avoiding ScrollView and forwards
            contentContainerStyle, so the existing page padding/layout is preserved (no-op on web). */}
        <KeyboardAwareScreen
          contentContainerStyle={[
            styles.page,
            { paddingTop: Math.max(spacing.md, insets.top + spacing.md) },
          ]}
        >
          {/* 1. LIST PAYMENT METHODS */}
          {mode === "method" ? (
            <View style={styles.sectionWrap}>
              <Text style={styles.infoTitle}>{tc("Payout Methods")}</Text>

              <View style={styles.methodListCard}>
                {methods.map((item) => (
                  <View key={item.id} style={styles.methodItemRow}>
                    <View style={styles.methodIconBox}>
                      {item.type === "promptpay" ? (
                        <PhoneIcon color={colors.primaryDark} size={20} />
                      ) : item.type === "bank" ? (
                        <BankIcon color={colors.primaryDark} size={20} />
                      ) : (
                        <CryptoIcon color={colors.primaryDark} size={20} />
                      )}
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodRowTitle}>{item.bankName}</Text>
                      <Text style={styles.methodRowSub}>{item.accountNo}</Text>
                    </View>
                    {item.isDefault ? (
                      <View style={styles.defaultPill}>
                        <Text style={styles.defaultPillText}>{tc("Default")}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>

              <Link asChild href="/method/create">
                <Pressable style={styles.primaryAction}>
                  <PlusIcon color={colors.white} size={16} />
                  <Text style={styles.primaryActionText}>{tc("Add Payout Method")}</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}

          {/* 2. CREATE PAYMENT METHOD */}
          {mode === "methodCreate" ? (
            <View style={styles.sectionWrap}>
              <Text style={styles.infoTitle}>{tc("Add Payout Method")}</Text>

              {/* Form tabs */}
              <View style={styles.tabStrip}>
                <Pressable
                  onPress={() => {
                    setCreateTab("bank");
                    setFocusedField(null);
                  }}
                  style={[styles.tabPill, createTab === "bank" && styles.tabPillActive]}
                >
                  <BankIcon color={createTab === "bank" ? colors.primaryDark : colors.muted} size={16} />
                  <Text style={[styles.tabText, createTab === "bank" && styles.tabTextActive]}>{tc("Bank")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setCreateTab("promptpay");
                    setFocusedField(null);
                  }}
                  style={[styles.tabPill, createTab === "promptpay" && styles.tabPillActive]}
                >
                  <PhoneIcon color={createTab === "promptpay" ? colors.primaryDark : colors.muted} size={16} />
                  <Text style={[styles.tabText, createTab === "promptpay" && styles.tabTextActive]}>PromptPay</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setCreateTab("crypto");
                    setFocusedField(null);
                  }}
                  style={[styles.tabPill, createTab === "crypto" && styles.tabPillActive]}
                >
                  <CryptoIcon color={createTab === "crypto" ? colors.primaryDark : colors.muted} size={16} />
                  <Text style={[styles.tabText, createTab === "crypto" && styles.tabTextActive]}>{tc("Crypto")}</Text>
                </Pressable>
              </View>

              {/* Notifications */}
              {errors.length > 0 ? (
                <View style={styles.errorBanner}>
                  <AlertIcon color={colors.danger} size={18} />
                  <View style={styles.errorContent}>
                    {errors.map((e, idx) => (
                      <Text key={idx} style={styles.errorText}>
                        • {e}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}

              {successMsg ? (
                <View style={styles.successBanner}>
                  <SuccessIcon color={colors.primaryDark} size={18} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              {/* Tab Form Containers */}
              <View style={styles.formCard}>
                {createTab === "bank" ? (
                  <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("Bank Name")}</Text>
                      <View style={[styles.inputBox, focusedField === "bankName" ? styles.inputFocused : null]}>
                        <TextInput
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setBankName}
                          onFocus={() => setFocusedField("bankName")}
                          placeholder={tc("Select bank (e.g. SCB, Kasikorn)")}
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={bankName}
                        />
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("Account Number")}</Text>
                      <View style={[styles.inputBox, focusedField === "bankAccountNo" ? styles.inputFocused : null]}>
                        <TextInput
                          keyboardType="numeric"
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setBankAccountNo}
                          onFocus={() => setFocusedField("bankAccountNo")}
                          placeholder={tc("Account Number")}
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={bankAccountNo}
                        />
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("Account Owner Name")}</Text>
                      <View style={[styles.inputBox, focusedField === "bankAccountName" ? styles.inputFocused : null]}>
                        <TextInput
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setBankAccountName}
                          onFocus={() => setFocusedField("bankAccountName")}
                          placeholder={tc("Full Name")}
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={bankAccountName}
                        />
                      </View>
                    </View>
                    <View style={styles.defaultRow}>
                      <Text style={styles.inputLabel}>{tc("Set as Default Method")}</Text>
                      <Pressable
                        onPress={() => setBankIsDefault(!bankIsDefault)}
                        style={[styles.switchOuter, bankIsDefault && styles.switchOuterOn]}
                      >
                        <View style={[styles.switchInner, bankIsDefault && styles.switchInnerOn]} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {createTab === "promptpay" ? (
                  <View style={styles.formSection}>
                    <View style={styles.idTypeRow}>
                      <Pressable
                        onPress={() => setPpIdType("phone")}
                        style={[styles.idTypeBtn, ppIdType === "phone" && styles.idTypeBtnActive]}
                      >
                        <View style={[styles.radioOuter, ppIdType === "phone" && styles.radioOuterActive]}>
                          {ppIdType === "phone" ? <View style={styles.radioInner} /> : null}
                        </View>
                        <Text style={[styles.idTypeBtnText, ppIdType === "phone" && styles.idTypeBtnTextActive]}>
                          {tc("Phone ID")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setPpIdType("citizen")}
                        style={[styles.idTypeBtn, ppIdType === "citizen" && styles.idTypeBtnActive]}
                      >
                        <View style={[styles.radioOuter, ppIdType === "citizen" && styles.radioOuterActive]}>
                          {ppIdType === "citizen" ? <View style={styles.radioInner} /> : null}
                        </View>
                        <Text style={[styles.idTypeBtnText, ppIdType === "citizen" && styles.idTypeBtnTextActive]}>
                          {tc("Citizen ID")}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("PromptPay Code")}</Text>
                      <View style={[styles.inputBox, focusedField === "ppCode" ? styles.inputFocused : null]}>
                        <TextInput
                          keyboardType="numeric"
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setPpCode}
                          onFocus={() => setFocusedField("ppCode")}
                          placeholder={tc("Phone number or 13-digit ID")}
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={ppCode}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("Owner Thai Name")}</Text>
                      <View style={[styles.inputBox, focusedField === "ppThaiName" ? styles.inputFocused : null]}>
                        <TextInput
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setPpThaiName}
                          onFocus={() => setFocusedField("ppThaiName")}
                          placeholder={tc("ภาษาไทย")}
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={ppThaiName}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("Owner English Name")}</Text>
                      <View style={[styles.inputBox, focusedField === "ppEnglishName" ? styles.inputFocused : null]}>
                        <TextInput
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setPpEnglishName}
                          onFocus={() => setFocusedField("ppEnglishName")}
                          placeholder={tc("English Name")}
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={ppEnglishName}
                        />
                      </View>
                    </View>

                    <View style={styles.defaultRow}>
                      <Text style={styles.inputLabel}>{tc("Set as Default Method")}</Text>
                      <Pressable
                        onPress={() => setPpIsDefault(!ppIsDefault)}
                        style={[styles.switchOuter, ppIsDefault && styles.switchOuterOn]}
                      >
                        <View style={[styles.switchInner, ppIsDefault && styles.switchInnerOn]} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {createTab === "crypto" ? (
                  <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{tc("Crypto Wallet Address")}</Text>
                      <View style={[styles.inputBox, focusedField === "cryptoAddress" ? styles.inputFocused : null]}>
                        <TextInput
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setCryptoAddress}
                          onFocus={() => setFocusedField("cryptoAddress")}
                          placeholder="0x..."
                          placeholderTextColor={colors.textSoft}
                          style={styles.textInput}
                          value={cryptoAddress}
                        />
                      </View>
                    </View>
                    <View style={styles.defaultRow}>
                      <Text style={styles.inputLabel}>{tc("Set as Default Method")}</Text>
                      <Pressable
                        onPress={() => setCryptoIsDefault(!cryptoIsDefault)}
                        style={[styles.switchOuter, cryptoIsDefault && styles.switchOuterOn]}
                      >
                        <View style={[styles.switchInner, cryptoIsDefault && styles.switchInnerOn]} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>

              <Pressable onPress={handleSaveMethod} style={styles.primaryAction}>
                <SaveIcon color={colors.white} size={16} />
                <Text style={styles.primaryActionText}>{tc("Save Payout Method")}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 3. CASHBACK WITHDRAWAL ACTION */}
          {mode === "withdraw" ? (
            <View style={styles.sectionWrap}>
              <Text style={styles.infoTitle}>{tc("Withdraw Rewards")}</Text>

              {/* Wallet Summary metrics card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{tc("Total Cashback Available")}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountText}>
                    {balance.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.currencyText}>THB</Text>
                </View>
                <Text style={styles.updateLabel}>Last Updated: 28 May 2026 07:00</Text>
              </View>

              {/* Notifications */}
              {errors.length > 0 ? (
                <View style={styles.errorBanner}>
                  <AlertIcon color={colors.danger} size={18} />
                  <View style={styles.errorContent}>
                    {errors.map((e, idx) => (
                      <Text key={idx} style={styles.errorText}>
                        • {e}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}

              {successMsg ? (
                <View style={styles.successBanner}>
                  <SuccessIcon color={colors.primaryDark} size={18} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{tc("Withdrawal Amount")}</Text>
                  <View style={[styles.inputBox, focusedField === "withdrawAmount" ? styles.inputFocused : null]}>
                    <CoinIcon color={colors.muted} size={16} />
                    <TextInput
                      keyboardType="numeric"
                      onBlur={() => setFocusedField(null)}
                      onChangeText={setWithdrawAmount}
                      onFocus={() => setFocusedField("withdrawAmount")}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSoft}
                      style={styles.textInput}
                      value={withdrawAmount}
                    />
                  </View>
                </View>

                {/* Payout method select row */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{tc("Payout Target Method")}</Text>
                  <View style={styles.payoutPicker}>
                    {methods.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => setSelectedMethodId(m.id)}
                        style={[
                          styles.payoutOption,
                          selectedMethodId === m.id && styles.payoutOptionActive,
                        ]}
                      >
                        <View style={[styles.radioOuter, selectedMethodId === m.id && styles.radioOuterActive]}>
                          {selectedMethodId === m.id ? <View style={styles.radioInner} /> : null}
                        </View>
                        <View style={styles.payoutOptionDetails}>
                          <Text style={styles.payoutOptionTitle}>{m.bankName}</Text>
                          <Text style={styles.payoutOptionSub}>{m.accountNo}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  {selectedMethod ? (
                    <Text style={styles.selectedMethodHint}>
                      {tc("Selected payout target:")} {selectedMethod.bankName}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                disabled={!!successMsg}
                onPress={handleWithdraw}
                style={[styles.primaryAction, successMsg ? styles.primaryActionDisabled : null]}
              >
                <Text style={styles.primaryActionText}>{tc("Confirm & Dispatch")}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 4. MY CASHBACK VIEW */}
          {mode === "myCashback" ? (
            <View style={styles.sectionWrap}>
              <View style={styles.hero}>
                <Text style={styles.kicker}>{tc("Rewards")}</Text>
                <Text style={styles.title}>{tc("My Cashback")}</Text>
                <Text style={styles.body}>
                  {tc("Track your reward collections, review pending validations, and proceed to withdrawal.")}
                </Text>
                <Link asChild href="/withdraw">
                  <Pressable style={styles.primaryAction}>
                    <Text style={styles.primaryActionText}>{tc("View Wallet Options")}</Text>
                  </Pressable>
                </Link>
              </View>

              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.rowText}>{tc("Total Earning tracked")}</Text>
                  <Text style={styles.rowValue}>3,504.60 THB</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowText}>{tc("Pending validation")}</Text>
                  <Text style={styles.rowValue}>633.60 THB</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowText}>{tc("Available payout balance")}</Text>
                  <Text style={styles.rowValue}>3,180.24 THB</Text>
                </View>
              </View>
            </View>
          ) : null}

          <Link asChild href={mode === "methodCreate" ? "/method" : "/wallet"}>
            <Pressable style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>
                {mode === "methodCreate" ? tc("Back to methods") : tc("Back to wallet")}
              </Text>
            </Pressable>
          </Link>
          <CustomerDesktopFooterSlot style={styles.desktopFooter} />
        </KeyboardAwareScreen>
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
  desktopFooter: {
    marginTop: 64,
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
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryActionDisabled: {
    opacity: 0.5,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "700",
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.chip,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryActionText: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: "700",
  },
  sectionWrap: {
    gap: spacing.md,
  },
  infoTitle: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: "700",
  },
  methodListCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
  },
  methodItemRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: 16,
  },
  methodIconBox: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  methodDetails: {
    flex: 1,
    paddingHorizontal: 16,
  },
  methodRowTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
  },
  methodRowSub: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
  },
  defaultPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultPillText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
  },
  tabStrip: {
    backgroundColor: "#EBF3FA",
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  tabPill: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 40,
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: colors.card,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  tabText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    boxShadow: shadows.cardCss,
  },
  formSection: {
    gap: spacing.md,
  },
  inputGroup: {
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
  // Brand-green focus ring on the input wrapper (where the resting border lives).
  inputFocused: {
    borderColor: colors.primary,
  },
  textInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    minHeight: 48,
    // Web: suppress the orange OS-accent UA focus outline; focus is conveyed by the green border.
    outlineColor: "transparent",
    outlineWidth: 0,
  },
  defaultRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  switchOuter: {
    backgroundColor: "#E4E4E4",
    borderRadius: radii.chip,
    height: 24,
    padding: 2,
    width: 44,
  },
  switchOuterOn: {
    backgroundColor: colors.primary,
  },
  switchInner: {
    backgroundColor: colors.white,
    borderRadius: radii.chip,
    height: 20,
    width: 20,
  },
  switchInnerOn: {
    transform: [{ translateX: 20 }],
  },
  idTypeRow: {
    flexDirection: "row",
    gap: 24,
    marginVertical: 4,
  },
  idTypeBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 28,
  },
  idTypeBtnActive: {},
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
  summaryCard: {
    backgroundColor: "#E1F8F2",
    borderColor: "#BDEFE0",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    padding: spacing.lg,
  },
  summaryLabel: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  amountRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  amountText: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 36,
  },
  currencyText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  updateLabel: {
    color: colors.accentSoft,
    fontSize: 11,
  },
  payoutPicker: {
    gap: 8,
  },
  payoutOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 64,
    paddingHorizontal: 16,
  },
  payoutOptionActive: {
    borderColor: colors.primaryDark,
    backgroundColor: "#F2FCF9",
  },
  payoutOptionDetails: {
    flex: 1,
  },
  payoutOptionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "700",
  },
  payoutOptionSub: {
    color: colors.muted,
    fontSize: 11,
  },
  selectedMethodHint: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
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
    fontWeight: "600",
  },
  rowValue: {
    color: colors.primaryDark,
    fontSize: typography.body,
    fontWeight: "800",
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
