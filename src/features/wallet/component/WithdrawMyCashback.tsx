"use client";
import Button from "@/components/common/Button";
import SubPage from "@/features/profile/layout/SubPage";
import useWithdrawMyCashback, { chainAll } from "@/hooks/useWithdrawMyCashback";
import { useRouter } from "@/i18n/navigation";
import { ResponseWithdrawCheckMyCashback, User } from "@/interfaces/auth";
import { DataMethodWithdraw } from "@/interfaces/withdraw";
import { fetcher, fetcherPost } from "@/lib/axios/client";
import { checkThai, formatAddress, formatNumber } from "@/lib/utils";
import { Divider, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import toast from "react-hot-toast";
import { trackMetaPurchase } from "@/lib/metaPixel";
import { trackCashbackWithdrawSuccess } from "@/lib/analytics";

const options = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "crypto", label: "Cryptocurrency" },
];

export interface BankSelected {
  value: string;
  label: string;
  data: DataMethodWithdraw;
}
const WithdrawMyCashback = () => {
  const [method, setMethod] = React.useState("bank_transfer");
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
  } = useWithdrawMyCashback();
  const { data: session } = useSession();
  const t = useTranslations();

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

  const { data: myCashback } = useQuery<ResponseWithdrawCheckMyCashback>({
    queryKey: ["myCashback"],
    queryFn: () => fetcherPost(`/withdraw/check-my-cashback`),
    enabled: session?.user !== null,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const optionMethodList = useMemo(() => {
    return methodsList
      ? methodsList?.map((method: DataMethodWithdraw) => ({
          value: method._id,
          label: `${method.bank_name} - ${formatAddress(method.account_no)}`,
          data: method,
        }))
      : [];
  }, [methodsList]);
  const handleChange = (event: SelectChangeEvent<string>) => {
    setMethod(event.target.value);
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      if (chainId != chainIdSelect) {
        await switchNetwork();
        setLoading(false);
        return;
      }
      fetcherPost("/withdraw/check-my-cashback")
        .then(async (res: ResponseWithdrawCheckMyCashback) => {
          if (res) {
            if (
              !res
              // ||
              // res.netMyCashbackUSD === 0 ||
              // res.netMyCashbackUSD < res.netAmountInvolveUSD
            ) {
              toast.error("No amount available for withdrawal.");
              setLoading(false);
              return;
            }
            if (!account) {
              toast.error("Please connect your wallet first.");
              setLoading(false);
              return;
            }

            // const id = session?.user._id || '';
            // const idT = item.aff_sub1?.split(':')[1] || '';
            // console.log('id, idT match:', id, idT);
            if (session?.user._id && res) {
              // if (id == idT) {
              // console.log('add', account, chainId);

              // toast.success('User ID matches. Proceeding with withdrawal.');
              if (account) {
                if (chainId !== chainIdSelect) {
                  await switchNetwork();
                  setLoading(false);
                  return;
                }
                await withdrawCashback({
                  userid: session?.user._id?.toString(),
                  userAddress: account,
                  totalCashbackAmount: "", // 10 tokens with 6 decimals
                  // totalCashbackAmount: res.netMyCashbackUSD?.toString(), // 10 tokens with 6 decimals
                  conversionIdHashes: res.conversionIdMyCashback,
                  // conversionIdHashes: [578760651, 578760751],
                  expireAt: Math.floor(Date.now() / 1000) + 20 * 60, // 20 minutes from now
                  info: res,
                }).then(() => {
                  const currency = checkThai ? "THB" : "USD";
                  const value = Number(
                    myCashback?.totalMyCashbackTHB || myCashback?.totalMyCashbackUSD || 0
                  );

                  trackCashbackWithdrawSuccess({
                    amount: value,
                    currency,
                    method: "crypto",
                    source: "withdraw_my_cashback",
                  });

                  // REQ-005: Meta Pixel Purchase (crypto)
                  trackMetaPurchase({
                    value,
                    currency,
                  });
                  // refetchGetCheckWallet();
                  setTimeout(() => {
                    setLoading(false);
                  }, 5000);
                  // toast.success('Withdrawal successful.');
                });
              } else {
                await connectWallet();
                setLoading(false);
                return;
              }
              // } else {
              //   toast.error('User ID does not match. Withdrawal aborted.');
              // }
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

  return (
    <SubPage
      title="Withdraw Cashback My Cashback"
      subTitle="Withdraw Your Cashback Earnings"
      showSubMenu
    >
      <div className="w-full rounded-3xl pt-10 border border-[#E4E4E4] p-6 flex flex-col gap-2">
        <h5 className="text-[14px] text-[#656565] font-normal text-center">
          {t("Enter Amount to Withdraw")} My Cashback
        </h5>
        <h1 className="text-[#00B14F] text-[24px] md:text-[30px] font-semibold text-center">
          {/* {formatNumber(
            checkThai
              ? Number(myCashback?.netMyCashbackTHB) || 0
              : Number(myCashback?.netMyCashbackUSD) || 0,
          )} */}
          {checkThai ? " THB" : " USD"}
        </h1>

        <Divider
          sx={{
            maxWidth: "580px",
            borderColor: "#000000",
            borderWidth: 0.3,
            width: "100%",
            marginX: "auto",
          }}
        />

        <h5 className="text-[14px] text-[#000000] font-normal my-2">{t("Withdrawal Method")}</h5>

        <Select
          sx={{ borderRadius: "16px" }}
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
            <h5 className="text-[14px] text-[#000000] font-normal my-2">{t("Select Network")}</h5>
            <Select
              sx={{ borderRadius: "16px" }}
              value={chainIdSelect}
              onChange={(val) => setChainIdSelect(val.target.value as number)} // set chainIdSelect
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
                sx={{
                  borderRadius: "16px",
                  border: bankSelect ? "unset" : "1px solid red",
                }}
                value={bankSelect?.value || ""}
                onChange={(val) => {
                  const selected = optionMethodList.find(
                    (option: BankSelected) => option.value === val.target.value
                  ) as BankSelected;
                  setBankSelect(selected);
                }}
                id="withdraw-bank-method-select"
              >
                {optionMethodList.map((option: BankSelected) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <>
                <Button
                  bgColor="#E6F7ED"
                  fontColor="#000000"
                  onClick={() => {
                    router.push("/method/create");
                  }}
                >
                  Add Bank
                </Button>
              </>
            )}
          </>
        )}

        <p className="text-[14px] text-[#656565] my-3">
          {t("Minimum withdrawal")}:{" "}
          {checkThai
            ? formatNumber(myCashback?.totalMyCashbackTHB || 0)
            : formatNumber(myCashback?.totalMyCashbackUSD || 0)}{" "}
          {checkThai ? "THB" : "USD"}
        </p>
        <p className="text-[16px] text-[#656565]">
          *{t("Your account will receive funds within 2–3 business days")}.
          <br />*
          {
            "When you receive cashback from GoGoCash that is greater than your MyCashback amount, you will then be able to withdraw the MyCashback portion."
          }
          <br />
        </p>
        <p className="font-semibold">
          Total Cashback Gogocash:{" "}
          {checkThai
            ? formatNumber(myCashback?.totalMyCashbackTHB || 0)
            : formatNumber(myCashback?.totalMyCashbackUSD || 0)}{" "}
          {checkThai ? "THB" : "USD"}
        </p>
        <Divider
          sx={{
            borderWidth: 0.3,
            width: "100%",
            my: 3,
          }}
        />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-1">
          <p className="min-w-0 text-[16px] text-[#000000]">{t("Active Balance")}</p>
          <p className="ml-auto min-w-0 text-[20px] text-[#000000]">
            {checkThai
              ? formatNumber(myCashback ? myCashback?.totalMyCashbackTHB : 0)
              : formatNumber(myCashback ? myCashback?.totalMyCashbackUSD : 0)}{" "}
            {checkThai ? "THB" : "USD"}
          </p>
        </div>
        {/* <div className="flex justify-between mt-3">
          <p className="text-[16px] text-[#000000]">{t("System Fee")}</p>
          <p className="ml-auto text-[20px] text-[#000000]">
            {checkThai
              ? formatNumber(Number(myCashback?.feeMyCashbackTHB) || 0)
              : formatNumber(Number(myCashback?.feeMyCashbackUSD) || 0)}{" "}
            {checkThai ? "THB" : "USD"}
          </p>
        </div> */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-1">
          <p className="min-w-0 text-[16px] text-[#000000]">{t("Withdraw Fee")}</p>
          <p className="ml-auto min-w-0 text-[20px] text-[#000000]">
            {/* {checkThai
              ? formatNumber(myCashback?.fee?.fee_withdraw_thb || 0)
              : formatNumber(myCashback?.fee?.fee_withdraw_usd || 0)}{" "}
            {checkThai ? "THB" : "USD"} */}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-1">
          <p className="min-w-0 text-[20px] text-[#000000]">{t("You will receive")}</p>
          <p className="ml-auto min-w-0 text-[30px] text-[#00B14F]">
            {/* {formatNumber(
              checkThai
                ? Number(myCashback?.netMyCashbackTHB) || 0
                : Number(myCashback?.netMyCashbackUSD) || 0,
            )}{" "} */}
            {checkThai ? "THB" : "USD"}
          </p>
        </div>
        <Divider
          sx={{
            borderWidth: 0.3,
            width: "100%",
            my: 3,
          }}
        />
        <div className="flex justify-center">
          <Button
            disabled={
              loading
              // ||
              // Number(myCashback?.totalInvolveTHB) <
              //   Number(myCashback?.totalMyCashbackTHB)
            }
            onClick={() => {
              setLoading(true);
              if (
                // Number(myCashback?.totalInvolveTHB) <
                Number(myCashback?.totalMyCashbackTHB)
              ) {
                toast.error("Insufficient cashback balance to withdraw.");
                setLoading(false);
                return;
              }
              if (method === "crypto") {
                handleWithdraw();
                setLoading(false);
              } else {
                if (bankSelect === null) {
                  toast.error("Please select a bank method.");
                  setLoading(false);
                  return;
                }
                if (!checkThai) {
                  toast.error("Bank transfer is only available for Thailand region.");
                  setLoading(false);
                  return;
                }
                if (!myCashback) {
                  toast.error("Unable to retrieve cashback information.");
                  setLoading(false);
                  return;
                }
                fetcherPost(`/withdraw/check-my-cashback`)
                  .then((res) => {
                    if (
                      res.netMyCashbackTHB === 0 ||
                      res.netMyCashbackTHB < res.netAmountInvolveTHB
                    ) {
                      toast.error("No amount available for withdrawal.");
                      setLoading(false);
                      return;
                    }
                    createTransactionWithdrawBank({
                      amount_total: Number(myCashback?.totalMyCashbackTHB),
                      // amount_net: Number(myCashback?.netMyCashbackTHB),
                      // percent_fee: Number(myCashback?.feePercentage),
                      method: method,
                      currency: "THB",
                      bank_name: bankSelect.data.bank_name,
                      account_number: bankSelect.data.account_no,
                      account_name: bankSelect.data.account_name,
                      mycashback_id: myCashback.conversionIdMyCashback,
                    });

                    // REQ-005: Meta Pixel Purchase (bank transfer)
                    trackMetaPurchase({
                      value: Number(myCashback?.totalMyCashbackTHB || 0),
                      currency: "THB",
                    });

                    setLoading(false);
                  })
                  .catch(() => {
                    toast.error("This transaction is already completed");
                    setLoading(false);
                  });

                // Handle bank transfer withdrawal
              }
            }}
            bgColor={chainId == chainIdSelect ? "#00B14F" : "#004A21"}
            height="52px"
            fontSize="16px"
            fontColor="#FFFFFF"
            className="max-w-[200px] mt-6 w-full"
            loading={loading}
          >
            {method === "bank_transfer" ? (
              "Withdraw"
            ) : (
              <>
                {account
                  ? chainId != chainIdSelect
                    ? "Switch Network"
                    : "Withdraw"
                  : "Connect Wallet"}
              </>
            )}
          </Button>
        </div>
      </div>
    </SubPage>
  );
};
export default WithdrawMyCashback;
