"use client";
import Button from "@/components/common/Button";
import { helpTooltipMuiSlotProps } from "@/components/common/helpTooltipMuiSlotProps";
import { WithdrawHelpTooltipList } from "@/components/common/WithdrawHelpTooltipList";
import ProfilePopperCustomerSupportIcon from "@/components/icons/ProfilePopperCustomerSupportIcon";
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
import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";
import { fetcher, fetcherPost } from "@/lib/axios/client";
import { checkThai, formatAddress, formatNumber } from "@/lib/utils";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
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
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import toast from "react-hot-toast";
import { trackCashbackWithdrawSuccess } from "@/lib/analytics";
import { POSTHOG_FLAG_KEYS, usePostHogFlagPayload } from "@/lib/posthog";

function withdrawAccountLast4(accountNo: string) {
  const digits = String(accountNo).replace(/\D/g, "");
  return digits.slice(-4) || "—";
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
  const [withdrawHelpOpen, setWithdrawHelpOpen] = React.useState(false);
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

  const { data: profile } = useQuery<User>({
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
  };

  const currencyCode = checkThai ? "THB" : "USD";

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

  const availableBalance = checkThai
    ? Number(getCheckWallet?.netAmountTHB || 0)
    : Number(getCheckWallet?.netAmount || 0);

  const withdrawPrimaryDisabled =
    loading ||
    Number(getCheckWallet?.netAmountTHB) < Number(getCheckWallet?.fee?.minimum_withdraw_thb)!;

  return (
    <SubPage title="Withdraw" showSubMenu>
      <div className="flex w-full max-w-[992px] flex-col gap-6">
        <h1 className="text-[28px] font-semibold leading-tight text-[#3b3b3b] md:text-[32px]">
          {t("Withdraw")}
        </h1>

        <div className="flex w-full flex-col gap-6 rounded-3xl bg-white p-8 md:p-10">
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
                  value={Number(withdrawAmount) === 0 ? 0 : withdrawAmount}
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
                    <p className="text-base font-medium text-[#3b3b3b]">{t("Select Network")}</p>
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
                                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#d32f2f" },
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

              <div className="flex flex-wrap gap-4">
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
                    if (method === "crypto") {
                      handleWithdraw();
                    } else {
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
                          getCheckWallet?.data.map(
                            (item: DataWithdrawCheck) => item.conversion_id
                          ) || [],
                        mycashback_id: getCheckWallet?.MCBCashback?.conversionIdMyCashback || [],
                      });
                    }
                  }}
                  bgColor={
                    method === "bank_transfer"
                      ? "#00cc99"
                      : chainId == chainIdSelect
                        ? "#00cc99"
                        : "#004A21"
                  }
                  height="52px"
                  fontSize="16px"
                  fontColor="#FFFFFF"
                  fontWeight={500}
                  className="max-w-[224px] w-full"
                  loading={loading}
                  endIcon={
                    method === "bank_transfer" ? (
                      <WithdrawIcon stroke="#fff" width="20" height="20" />
                    ) : undefined
                  }
                >
                  {method === "bank_transfer" ? (
                    withdrawEducationExperiment.withdraw_label || t("walletTransactionsWithdraw")
                  ) : (
                    <>
                      {account
                        ? chainId != chainIdSelect
                          ? withdrawEducationExperiment.switch_network_label || "Switch Network"
                          : withdrawEducationExperiment.withdraw_label ||
                            t("walletTransactionsWithdraw")
                        : withdrawEducationExperiment.connect_wallet_label || "Connect Wallet"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 rounded-2xl bg-[#eaf4ff] p-6 md:flex-row md:items-center">
            <ProfilePopperCustomerSupportIcon
              width={32}
              height={32}
              fill="#3b3b3b"
              className="shrink-0"
            />
            <div className="flex flex-1 flex-col gap-1 text-base leading-snug text-[#3b3b3b]">
              <p>{t("withdrawSupportBannerLine1")}</p>
              <p>{t("withdrawSupportBannerLine2")}</p>
            </div>
            <a
              href={SUPPORT_LINE_OFFICIAL_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#3b3b3b] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("withdrawContactSupport")}
            </a>
          </div>
        </div>
      </div>
    </SubPage>
  );
};

export default MyWalletWithdraw;
