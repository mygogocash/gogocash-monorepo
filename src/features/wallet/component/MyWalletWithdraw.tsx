"use client";
import Button from "@/components/common/Button";
import { helpTooltipMuiSlotProps } from "@/components/common/helpTooltipMuiSlotProps";
import { WithdrawHelpTooltipList } from "@/components/common/WithdrawHelpTooltipList";
import WithdrawIcon from "@/components/icons/WithdrawIcon";
import SubPage from "@/features/profile/layout/SubPage";
import useWithdrawWeb3, { chainAll } from "@/hooks/useWithdrawWeb3";
import { useRouter } from "@/i18n/navigation";
import { User } from "@/interfaces/auth";
import {
  DataMethodWithdraw,
  DataWithdrawCheck,
  FeeData,
  ResponseWithdrawCheck,
} from "@/interfaces/withdraw";
import { ProfileSupportHelpBanner } from "@/components/common/ProfileSupportHelpBanner";
import { WithdrawKycRequiredDialog } from "@/components/common/WithdrawKycRequiredDialog";
import { fetcher, fetcherPost } from "@/lib/axios/client";
import { checkThai, formatAddress, formatNumber } from "@/lib/utils";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  ClickAwayListener,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import React, { useMemo } from "react";
import toast from "react-hot-toast";
import { trackCashbackWithdrawSuccess } from "@/lib/analytics";
import { POSTHOG_FLAG_KEYS, usePostHogFlagPayload } from "@/lib/posthog";
import { isWithdrawProfileKycComplete } from "@/lib/profile/withdrawKycGate";
import {
  getProfileWithdrawKycIncompletePath,
  WITHDRAW_FLOW_READY,
} from "@/lib/profile/withdrawFlowRoutes";
import { desktopMenuBarNav } from "@/constants/navigation";
import { getWithdrawConfirmActionCopy, getWithdrawFormCtaCopy } from "@/i18n/withdrawCtaMerge";
import { WithdrawConfirmProgressHeader } from "@/features/wallet/component/WithdrawConfirmProgressHeader";
import {
  WithdrawConfirmBankMethodDetail,
  WithdrawConfirmSummaryCard,
} from "@/features/wallet/component/WithdrawConfirmSummaryCard";

function withdrawAccountLast4(accountNo: string) {
  const digits = String(accountNo).replace(/\D/g, "");
  return digits.slice(-4) || "—";
}

/** PostHog sometimes stores an i18n key string; never render that as visible copy. */
function isInvalidExperimentWithdrawLabel(label: string | undefined): boolean {
  const s = label?.trim();
  if (!s) return true;
  if (s === "withdrawFormConfirmAndWithdraw" || s === "walletTransactionsWithdraw") return true;
  return false;
}

const selectOutlineSx = {
  borderRadius: "16px",
  height: 56,
  "& .MuiSelect-select": { display: "flex", alignItems: "center", py: 1.5 },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(152, 152, 152, 0.4)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(152, 152, 152, 0.55)",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#00cc99",
    borderWidth: "1px",
  },
} as const;

const options = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "crypto", label: "Cryptocurrency" },
];

export interface BankSelected {
  value: string;
  label: string;
  data: DataMethodWithdraw;
}

const MyWalletWithdraw = () => {
  const [method, setMethod] = React.useState("bank_transfer");
  const [withdrawUiStep, setWithdrawUiStep] = React.useState<"form" | "confirm">("form");
  const [withdrawHelpOpen, setWithdrawHelpOpen] = React.useState(false);
  const [withdrawKycModalOpen, setWithdrawKycModalOpen] = React.useState(false);
  const router = useRouter();
  const {
    withdrawCashback,
    account,
    chainId,
    connectWallet,
    switchNetwork,
    loading,
    setLoading,
    chainIdSelect,
    setChainIdSelect,
    createTransactionWithdrawBank,
    bankSelect,
    setBankSelect,
    withdrawAmount,
    setWithdrawAmount,
    refetchGetCheckWallet,
    getCheckWallet,
    getCheckWalletError,
    wihdrawFee,
  } = useWithdrawWeb3();
  const { data: session } = useSession();
  const locale = useLocale();
  const withdrawFormCtaCopy = useMemo(() => getWithdrawFormCtaCopy(locale), [locale]);
  const withdrawConfirmActionCopy = useMemo(() => getWithdrawConfirmActionCopy(locale), [locale]);
  /** Figma “Top Brands” tab — `desktopMenuBarNav` id `top-brands`. */
  const topBrandsHref = useMemo(
    () => desktopMenuBarNav.find((item) => item.id === "top-brands")?.href ?? "/",
    []
  );
  const t = useTranslations();
  const withdrawEducationExperiment = usePostHogFlagPayload<{
    guidance?: string;
    withdraw_label?: string;
    connect_wallet_label?: string;
    switch_network_label?: string;
  }>(POSTHOG_FLAG_KEYS.withdrawEducation, {});

  const { data: methodsList } = useQuery<DataMethodWithdraw[]>({
    queryKey: ["methodsList"],
    queryFn: () => fetcher(`/withdraw/methods-list`),
    enabled: session?.user !== null,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: profile, isPending: profilePending } = useQuery<User>({
    queryKey: ["profileUser"],
    queryFn: () => fetcher(`/user/profile`),
    enabled: session?.user !== null,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const optionMethodList = useMemo(() => {
    return methodsList
      ? methodsList?.map((methodItem: DataMethodWithdraw) => ({
          value: methodItem._id,
          label: `${methodItem.bank_name} - ${formatAddress(methodItem.account_no)}`,
          data: methodItem,
        }))
      : [];
  }, [methodsList]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setMethod(event.target.value);
    setWithdrawUiStep("form");
    router.replace("/withdraw");
  };

  const currencyCode = checkThai ? "THB" : "USD";

  const withdrawConfirmRequestTime = useMemo(() => {
    if (withdrawUiStep !== "confirm") {
      return { datePart: "", timePart: "" };
    }
    const d = new Date();
    const localeTag = locale === "th" ? "th-TH" : "en-GB";
    return {
      datePart: new Intl.DateTimeFormat(localeTag, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d),
      timePart: new Intl.DateTimeFormat(localeTag, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d),
    };
  }, [locale, withdrawUiStep]);

  const minWithdrawNum = checkThai
    ? getCheckWallet
      ? Number(getCheckWallet.fee?.minimum_withdraw_thb)
      : Number(
          (getCheckWalletError as unknown as { data: { fee: FeeData } })?.data?.fee
            ?.minimum_withdraw_thb
        )
    : getCheckWallet
      ? Number(getCheckWallet.fee?.minimum_withdraw_usd)
      : Number(
          (getCheckWalletError as unknown as { data: { fee: FeeData } })?.data?.fee
            ?.minimum_withdraw_usd
        );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("flow") === WITHDRAW_FLOW_READY) {
      setWithdrawUiStep("confirm");
    }
  }, []);

  React.useEffect(() => {
    if (profilePending) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("flow") !== WITHDRAW_FLOW_READY) return;
    if (!isWithdrawProfileKycComplete(profile)) {
      router.replace(getProfileWithdrawKycIncompletePath());
    }
  }, [profile, profilePending, router]);

  const enterWithdrawReadyFlow = React.useCallback(() => {
    setWithdrawUiStep("confirm");
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("flow", WITHDRAW_FLOW_READY);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      if (chainId != chainIdSelect) {
        await switchNetwork();
        setLoading(false);
        return;
      }
      fetcherPost("/withdraw/check")
        .then(async (res: ResponseWithdrawCheck) => {
          if (res) {
            if (!res || res.netAmount === 0) {
              toast.error("No amount available for withdrawal.");
              setLoading(false);
              return;
            }
            if (!account) {
              toast.error("Please connect your wallet first.");
              setLoading(false);
              return;
            }
            if (session?.user._id && res) {
              if (account) {
                if (chainId !== chainIdSelect) {
                  await switchNetwork();
                  setLoading(false);
                  return;
                }
                await withdrawCashback({
                  userid: session?.user._id?.toString(),
                  userAddress: account,
                  totalCashbackAmount: res.netAmount?.toString(),
                  conversionIdHashes: res?.data.map((item) => item.conversion_id as number),
                  expireAt: Math.floor(Date.now() / 1000) + 20 * 60,
                  info: res,
                }).then(() => {
                  trackCashbackWithdrawSuccess({
                    amount: Number(res.netAmount || 0),
                    currency: checkThai ? "THB" : "USD",
                    method: "crypto",
                    source: "withdraw_wallet",
                  });
                  refetchGetCheckWallet();
                  setTimeout(() => {
                    setLoading(false);
                  }, 5000);
                });
              } else {
                await connectWallet();
                setLoading(false);
                return;
              }
            } else {
              toast.error("User not logged in. Please log in to withdraw.");
            }
          }
        })
        .catch(() => {
          toast.error("This transaction is already completed");
          setLoading(false);
        });
    } catch {
      setLoading(false);
      toast.error("Withdrawal failed. Please try again.");
    }
  };

  const submitWithdrawalRequest = () => {
    if (method === "crypto") {
      void handleWithdraw();
      return;
    }
    if (bankSelect === null) {
      toast.error("Please select a bank method.");
      return;
    }
    if (!checkThai) {
      toast.error("Bank transfer is only available for Thailand region.");
      return;
    }
    const fee = checkThai
      ? getCheckWallet?.fee?.fee_withdraw_thb
      : getCheckWallet?.fee?.fee_withdraw_usd;
    createTransactionWithdrawBank({
      amount_total: Number(withdrawAmount),
      amount_net: Number(withdrawAmount) - Number(fee || 0),
      percent_fee: Number(getCheckWallet?.feePercentage),
      method: method,
      currency: "THB",
      bank_name: bankSelect.data.bank_name,
      account_number: bankSelect.data.account_no,
      account_name: bankSelect.data.account_name,
      conversion_ids:
        getCheckWallet?.data.map((item: DataWithdrawCheck) => item.conversion_id) || [],
      mycashback_id: getCheckWallet?.MCBCashback?.conversionIdMyCashback || [],
    });
  };

  const availableBalance = checkThai
    ? Number(getCheckWallet?.netAmountTHB || 0)
    : Number(getCheckWallet?.netAmount || 0);

  const withdrawPrimaryDisabled =
    loading ||
    Number(getCheckWallet?.netAmountTHB) < Number(getCheckWallet?.fee?.minimum_withdraw_thb)!;

  return (
    <SubPage title="Withdraw" showSubMenu>
      <WithdrawKycRequiredDialog
        open={withdrawKycModalOpen}
        onClose={() => setWithdrawKycModalOpen(false)}
        onContinue={() => {
          setWithdrawKycModalOpen(false);
          router.push(getProfileWithdrawKycIncompletePath());
        }}
      />
      <div className="flex w-full max-w-[992px] flex-col gap-6">
        <h1 className="text-[28px] font-semibold leading-tight text-[#3b3b3b] md:text-[32px]">
          {t("Withdraw")}
        </h1>

        <div className="flex w-full flex-col gap-6 rounded-3xl bg-white p-8 md:p-10">
          {withdrawUiStep === "form" ? (
            <>
              <div className="flex w-full items-start gap-2">
                <p className="flex-1 text-2xl font-normal leading-snug text-black">
                  {t("Withdraw Your Cashback Earnings")}
                </p>
                <ClickAwayListener onClickAway={() => setWithdrawHelpOpen(false)}>
                  <span className="inline-flex shrink-0">
                    <Tooltip
                      open={withdrawHelpOpen}
                      onClose={() => setWithdrawHelpOpen(false)}
                      disableHoverListener
                      disableFocusListener
                      disableTouchListener
                      title={<WithdrawHelpTooltipList />}
                      placement="bottom-end"
                      arrow
                      enterTouchDelay={0}
                      leaveTouchDelay={0}
                      slotProps={helpTooltipMuiSlotProps}
                    >
                      <IconButton
                        type="button"
                        size="small"
                        onClick={() => setWithdrawHelpOpen((open) => !open)}
                        aria-expanded={withdrawHelpOpen}
                        aria-label={t("withdrawHelpTooltipAriaLabel")}
                        sx={{ p: 0.5 }}
                      >
                        <HelpOutlineIcon sx={{ fontSize: 32, color: "#3b3b3b" }} />
                      </IconButton>
                    </Tooltip>
                  </span>
                </ClickAwayListener>
              </div>

              <div className="flex w-full flex-col gap-10 rounded-2xl border border-[#e4e4e4] px-8 py-8">
                <div className="flex flex-col items-center gap-1">
                  <p className="w-full max-w-[400px] text-center text-xl text-[#7f7f7f]">
                    {t("Enter Amount to Withdraw")}
                  </p>
                  <div className="flex w-full max-w-[400px] flex-col items-center border-b-2 border-[#00cc99]">
                    <input
                      type="text"
                      name="withdraw_amount"
                      inputMode="decimal"
                      value={
                        withdrawAmount === "" || withdrawAmount == null
                          ? ""
                          : Number(withdrawAmount) === 0
                            ? "0"
                            : withdrawAmount
                      }
                      className="w-full bg-transparent py-1 text-center text-4xl font-semibold text-[#3b3b3b] outline-none md:text-[56px] md:leading-tight"
                      onChange={(event) => {
                        const amount = event.target.value.replace(/[^0-9.]/g, "");
                        const netTHB = Number(getCheckWallet?.netAmountTHB);
                        const netUSD = Number(getCheckWallet?.netAmount);
                        const decimalCount = (amount.split(".")[1] || "").length;

                        if (checkThai) {
                          if (Number(amount) >= netTHB) {
                            setWithdrawAmount(netTHB?.toFixed(2));
                          } else {
                            setWithdrawAmount(decimalCount > 2 ? netTHB?.toFixed(2) : amount);
                          }
                        } else {
                          if (Number(amount) >= netUSD) {
                            setWithdrawAmount(netUSD?.toFixed(2));
                          } else {
                            setWithdrawAmount(decimalCount > 2 ? netUSD?.toFixed(2) : amount);
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="mt-2 text-center text-base text-[#7f7f7f]">
                    {t("withdrawAvailableAmount")} : {formatNumber(availableBalance)} {currencyCode}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-8">
                  <div className="flex w-full flex-col gap-4">
                    <p className="text-lg font-medium text-[#3b3b3b]">{t("Withdrawal Method")}</p>

                    <Select
                      fullWidth
                      sx={selectOutlineSx}
                      value={method}
                      onChange={handleChange}
                      id="withdraw-method-select"
                    >
                      {(profile && profile?.country === "Thailand") || checkThai
                        ? options
                            ?.filter((item) => item.value !== "crypto")
                            .map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))
                        : options.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                    </Select>

                    {method === "crypto" ? (
                      <>
                        <p className="text-base font-medium text-[#3b3b3b]">
                          {t("Select Network")}
                        </p>
                        <Select
                          fullWidth
                          sx={selectOutlineSx}
                          value={chainIdSelect}
                          onChange={(val) => setChainIdSelect(val.target.value as number)}
                          id="network-select"
                        >
                          {chainAll.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </>
                    ) : (
                      <>
                        {optionMethodList.length > 0 ? (
                          <Select
                            fullWidth
                            displayEmpty
                            sx={{
                              ...selectOutlineSx,
                              ...(!bankSelect
                                ? {
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: "#d32f2f",
                                    },
                                  }
                                : {}),
                            }}
                            value={bankSelect?.value || ""}
                            onChange={(val) => {
                              const selected = optionMethodList.find(
                                (option: BankSelected) => option.value === val.target.value
                              ) as BankSelected;
                              setBankSelect(selected);
                            }}
                            id="withdraw-bank-method-select"
                            renderValue={(selected) => {
                              if (!selected) {
                                return (
                                  <span className="text-[#7f7f7f]">
                                    {t("withdrawMethodFormSelectBankPlaceholder")}
                                  </span>
                                );
                              }
                              const opt = optionMethodList.find((o) => o.value === selected);
                              if (!opt) return selected;
                              const m = opt.data;
                              const last4 = withdrawAccountLast4(m.account_no);
                              return (
                                <div className="flex w-full items-center justify-between gap-3 pr-1 text-left">
                                  <span className="flex flex-wrap items-center gap-2 font-medium text-[#3b3b3b]">
                                    <span>{t("withdrawMethodBankShort")}</span>
                                    <span>***{last4}</span>
                                  </span>
                                  {m.is_default ? (
                                    <span className="shrink-0 text-sm font-medium text-[#00cc99]">
                                      {t("withdrawMethodDefaultBadge")}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            }}
                          >
                            {optionMethodList.map((option: BankSelected) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <Button
                            bgColor="#E6F7ED"
                            fontColor="#000000"
                            onClick={() => {
                              router.push("/method/create");
                            }}
                          >
                            Add Bank
                          </Button>
                        )}
                      </>
                    )}

                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#7f7f7f]">
                        {t("Minimum withdrawal")}: {formatNumber(minWithdrawNum)} {currencyCode}
                      </p>
                      {method === "bank_transfer" && optionMethodList.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => router.push("/method")}
                          className="rounded-full border border-[#00cc99] px-4 py-2 text-xs font-medium text-[#00cc99] transition-opacity hover:opacity-90"
                        >
                          {t("withdrawManageMethod")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-4">
                    <p className="text-lg font-medium text-[#3b3b3b]">
                      {t("withdrawTotalWithdrawalAmount")}
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base text-[#989898]">{t("Active Balance")}</span>
                        <span className="text-right text-xl font-semibold text-[#3b3b3b]">
                          {checkThai
                            ? formatNumber(
                                getCheckWallet && getCheckWallet?.netAmountTHB > 0
                                  ? getCheckWallet?.netAmountTHB
                                  : 0
                              )
                            : formatNumber(
                                getCheckWallet && getCheckWallet?.netAmount > 0
                                  ? getCheckWallet?.netAmount
                                  : 0
                              )}{" "}
                          {currencyCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base text-[#989898]">{t("Withdraw Fee")}</span>
                        <span className="text-right text-xl font-semibold text-[#3b3b3b]">
                          {checkThai
                            ? formatNumber(getCheckWallet?.fee?.fee_withdraw_thb || 0)
                            : formatNumber(getCheckWallet?.fee?.fee_withdraw_usd || 0)}{" "}
                          {currencyCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base text-[#3b3b3b]">{t("You will receive")}</span>
                        <span className="text-right text-[28px] font-semibold leading-tight text-[#00cc99] md:text-[32px]">
                          {formatNumber(
                            Number(withdrawAmount) - wihdrawFee > 0
                              ? Number(withdrawAmount) - wihdrawFee
                              : 0
                          )}{" "}
                          {currencyCode}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[#e4e4e4] pt-4">
                      <div className="flex items-start gap-2 text-base leading-snug text-[#7f7f7f]">
                        <AccountBalanceWalletOutlinedIcon
                          sx={{ fontSize: 18, color: "#7f7f7f", flexShrink: 0, mt: "2px" }}
                        />
                        <p>{t("withdrawTransferNotice")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => router.push("/wallet")}
                      className="flex h-[52px] w-full max-w-[224px] items-center justify-center rounded-full border border-[#7f7f7f] bg-white text-base font-medium text-[#7f7f7f] transition-opacity hover:opacity-80"
                    >
                      {t("withdrawBackToWallet")}
                    </button>
                    <Button
                      disabled={withdrawPrimaryDisabled}
                      onClick={() => {
                        if (profilePending) {
                          toast.error(t("withdrawProfileLoading"));
                          return;
                        }
                        if (!isWithdrawProfileKycComplete(profile)) {
                          setWithdrawKycModalOpen(true);
                          return;
                        }
                        if (method === "crypto") {
                          if (!account || chainId !== chainIdSelect) {
                            void handleWithdraw();
                            return;
                          }
                          enterWithdrawReadyFlow();
                          return;
                        }
                        if (bankSelect === null) {
                          toast.error("Please select a bank method.");
                          return;
                        }
                        if (!checkThai) {
                          toast.error("Bank transfer is only available for Thailand region.");
                          return;
                        }
                        enterWithdrawReadyFlow();
                      }}
                      bgColor={
                        method === "bank_transfer"
                          ? "#00cc99"
                          : chainId == chainIdSelect
                            ? "#00cc99"
                            : "#004A21"
                      }
                      fontSize="16px"
                      fontColor="#FFFFFF"
                      fontWeight={500}
                      className="max-w-[280px] min-w-[200px] w-full"
                      loading={loading}
                      endIcon={
                        method === "bank_transfer" ? (
                          <WithdrawIcon stroke="#fff" width="20" height="20" />
                        ) : undefined
                      }
                      sx={{
                        minHeight: "56px",
                        height: "auto",
                        py: 1.25,
                        whiteSpace: "normal",
                      }}
                    >
                      {method === "bank_transfer" ? (
                        isInvalidExperimentWithdrawLabel(
                          withdrawEducationExperiment.withdraw_label
                        ) ? (
                          <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center">
                            <span className="text-[15px] font-semibold leading-tight tracking-tight">
                              {withdrawFormCtaCopy.title}
                            </span>
                            <span className="text-[12px] font-medium leading-tight text-white/92">
                              {withdrawFormCtaCopy.subtitle}
                            </span>
                          </span>
                        ) : (
                          <span className="px-1 text-center leading-snug">
                            {withdrawEducationExperiment.withdraw_label}
                          </span>
                        )
                      ) : (
                        <>
                          {!account ? (
                            withdrawEducationExperiment.connect_wallet_label || "Connect Wallet"
                          ) : chainId != chainIdSelect ? (
                            withdrawEducationExperiment.switch_network_label || "Switch Network"
                          ) : isInvalidExperimentWithdrawLabel(
                              withdrawEducationExperiment.withdraw_label
                            ) ? (
                            <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center">
                              <span className="text-[15px] font-semibold leading-tight tracking-tight">
                                {withdrawFormCtaCopy.title}
                              </span>
                              <span className="text-[12px] font-medium leading-tight text-white/92">
                                {withdrawFormCtaCopy.subtitle}
                              </span>
                            </span>
                          ) : (
                            <span className="px-1 text-center leading-snug">
                              {withdrawEducationExperiment.withdraw_label}
                            </span>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                  {process.env.NODE_ENV === "development" ? (
                    <div
                      className="flex w-full flex-wrap items-center justify-center gap-3 border-t border-dashed border-[#e4e4e4] pt-4"
                      data-testid="withdraw-dev-test-actions"
                    >
                      <button
                        type="button"
                        onClick={() => setWithdrawKycModalOpen(true)}
                        className="rounded-full border border-[#c4c4c4] bg-[#fafafa] px-4 py-2 text-xs font-medium text-[#666] transition-colors hover:border-[#00cc99] hover:text-[#3b3b3b]"
                      >
                        [Dev] Test KYC modal
                      </button>
                      <button
                        type="button"
                        onClick={() => enterWithdrawReadyFlow()}
                        className="rounded-full border border-[#c4c4c4] bg-[#fafafa] px-4 py-2 text-xs font-medium text-[#666] transition-colors hover:border-[#00cc99] hover:text-[#3b3b3b]"
                      >
                        [Dev] Test confirm step
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <ProfileSupportHelpBanner />
            </>
          ) : (
            <>
              <div className="flex w-full flex-col gap-6 md:gap-8">
                <WithdrawConfirmProgressHeader
                  headline={t("withdrawConfirmTitle")}
                  subline={t("withdrawConfirmBody")}
                />
                <WithdrawConfirmSummaryCard
                  summaryHeading={t("withdrawConfirmSummaryHeading")}
                  requestDateText={withdrawConfirmRequestTime.datePart}
                  requestTimeText={withdrawConfirmRequestTime.timePart}
                  heroAmountLabel={t("withdrawConfirmAmountHeroLabel")}
                  heroAmountValue={formatNumber(Number(withdrawAmount) || 0)}
                  currencyCode={currencyCode}
                  reviewBadgeLabel={withdrawConfirmActionCopy.reviewBadge}
                  amountToWithdrawLabel={t("withdrawConfirmAmountToWithdrawLabel")}
                  amountToWithdrawDisplay={formatNumber(Number(withdrawAmount) || 0)}
                  withdrawFeeLabel={t("Withdraw Fee")}
                  withdrawFeeDisplay={formatNumber(
                    checkThai
                      ? getCheckWallet?.fee?.fee_withdraw_thb || 0
                      : getCheckWallet?.fee?.fee_withdraw_usd || 0
                  )}
                  paymentMethodLabel={t("withdrawConfirmMethodLabel")}
                  paymentMethodDetail={
                    method === "bank_transfer" && bankSelect ? (
                      <WithdrawConfirmBankMethodDetail
                        bankLabel={t("withdrawMethodBankShort")}
                        accountLast4={withdrawAccountLast4(bankSelect.data.account_no)}
                      />
                    ) : (
                      <>
                        <CurrencyBitcoinIcon sx={{ fontSize: 22, color: "#3b3b3b" }} />
                        <span className="max-w-[min(100%,240px)] text-right font-semibold text-[#3b3b3b]">
                          {options.find((o) => o.value === "crypto")?.label ?? "Cryptocurrency"}
                          {chainIdSelect != null
                            ? ` · ${chainAll.find((c) => c.value === chainIdSelect)?.label ?? ""}`
                            : ""}
                        </span>
                      </>
                    )
                  }
                  youWillReceiveLabel={t("You will receive")}
                  youWillReceiveDisplay={formatNumber(
                    Number(withdrawAmount) - wihdrawFee > 0
                      ? Number(withdrawAmount) - wihdrawFee
                      : 0
                  )}
                />
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => router.push("/wallet")}
                    className="flex h-[52px] w-full max-w-[224px] items-center justify-center rounded-full border border-[#7f7f7f] bg-white text-base font-medium text-[#7f7f7f] transition-opacity hover:opacity-80"
                  >
                    {withdrawConfirmActionCopy.goToWallet}
                  </button>
                  <Button
                    onClick={() => router.push(topBrandsHref)}
                    bgColor="#00cc99"
                    height="52px"
                    fontSize="16px"
                    fontColor="#FFFFFF"
                    fontWeight={500}
                    className="max-w-[224px] w-full"
                  >
                    {withdrawConfirmActionCopy.continueShopping}
                  </Button>
                </div>
                {process.env.NODE_ENV === "development" ? (
                  <div className="flex w-full justify-center border-t border-dashed border-[#e4e4e4] pt-4">
                    <button
                      type="button"
                      onClick={() => submitWithdrawalRequest()}
                      className="rounded-full border border-[#c4c4c4] bg-[#fafafa] px-4 py-2 text-xs font-medium text-[#666] transition-colors hover:border-[#00cc99] hover:text-[#3b3b3b]"
                    >
                      [Dev] Submit withdrawal
                    </button>
                  </div>
                ) : null}
              </div>
              <ProfileSupportHelpBanner />
            </>
          )}
        </div>
      </div>
    </SubPage>
  );
};

export default MyWalletWithdraw;
