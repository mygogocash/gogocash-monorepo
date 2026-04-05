"use client";

import Button from "@/components/common/Button";
import type { ResponseWithdrawCheckMyCashback } from "@/interfaces/auth";
import type { ResponseWithdrawCheck } from "@/interfaces/withdraw";
import { formatNumber } from "@/lib/utils";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import { useTranslations } from "next-intl";

type Props = {
  myCashback: ResponseWithdrawCheckMyCashback;
  getCheck: ResponseWithdrawCheck | undefined;
  checkThai: boolean;
  onWithdraw: () => void;
};

export default function ProfileCashbackSummaryCard({
  myCashback,
  getCheck,
  checkThai,
  onWithdraw,
}: Props) {
  const t = useTranslations();
  const currency = checkThai ? "THB" : "USD";

  const hasLinkedMyCashback =
    Array.isArray(myCashback.conversionIdMyCashback) &&
    myCashback.conversionIdMyCashback.length > 0;

  const myCashbackAmount = hasLinkedMyCashback
    ? checkThai
      ? Number(myCashback.availableTHB) || 0
      : Number(myCashback.availableUSD) || 0
    : 0;

  const goGoAmount = checkThai
    ? Number(getCheck?.netAmountTHB) || 0
    : Number(getCheck?.netAmount) || 0;

  const totalAvailable = myCashbackAmount + goGoAmount;

  return (
    <section
      className="flex w-full flex-col overflow-hidden rounded-3xl border border-[#e4e4e4] bg-white shadow-sm"
      aria-labelledby="profile-cashback-heading"
    >
      <div className="border-b border-[#e8f5ef] bg-gradient-to-br from-[#ecfdf5] via-[#f6fef9] to-white px-5 pb-5 pt-6 md:px-6 md:pb-6 md:pt-7">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[#0d5c45]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#00AA80] shadow-sm ring-1 ring-[#d1fae5]">
                <AccountBalanceWalletOutlined sx={{ fontSize: 22 }} aria-hidden />
              </span>
              <h3
                id="profile-cashback-heading"
                className="min-w-0 text-lg font-semibold text-[#103522] md:text-xl"
              >
                {t("Total Cashback")}
              </h3>
            </div>
            <div className="shrink-0">
              <Button
                type="button"
                onClick={onWithdraw}
                uiVariant="ghost"
                uiSize="sm"
                sx={{
                  border: "1px solid #00CC99 !important",
                  color: "#ffffff",
                  background: "#00CC99 !important",
                  minHeight: "32px",
                  fontWeight: 500,
                  px: 2,
                  fontSize: "12px",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    background: "#00b88a !important",
                    borderColor: "#00b88a !important",
                    boxShadow: "none",
                  },
                }}
              >
                {t("Withdraw")}
              </Button>
            </div>
          </div>
          <p className="pl-[44px] text-sm leading-snug text-[#6b7280] md:max-w-md">
            {t("profileCashbackCardHint")}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#d1fae5]/80 bg-white/90 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:px-5 md:py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
            {t("profileCashbackAvailableTitle")}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-[#103522] md:text-4xl">
              {formatNumber(totalAvailable)}
            </span>
            <span className="rounded-full bg-[#e7f8ee] px-2.5 py-0.5 text-sm font-semibold text-[#0f5132]">
              {currency}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5 md:px-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
          {t("profileCashbackBreakdownTitle")}
        </h4>
        <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
          {hasLinkedMyCashback ? (
            <li>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-3.5 transition-colors hover:border-[#e5e5e5]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#3b3b3b]">
                    {t("profileCashbackSourceConnected")}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6b7280]">{t("My Cashback Balance")}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold tabular-nums text-[#103522]">
                    {formatNumber(myCashbackAmount)}
                  </p>
                  <p className="text-xs text-[#6b7280]">{currency}</p>
                </div>
              </div>
            </li>
          ) : null}
          <li>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-3.5 transition-colors hover:border-[#e5e5e5]">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#3b3b3b]">
                  {t("profileCashbackSourceGoGo")}
                </p>
                <p className="mt-0.5 text-xs text-[#6b7280]">{t("GoGoCash")}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-semibold tabular-nums text-[#103522]">
                  {formatNumber(goGoAmount)}
                </p>
                <p className="text-xs text-[#6b7280]">{currency}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
