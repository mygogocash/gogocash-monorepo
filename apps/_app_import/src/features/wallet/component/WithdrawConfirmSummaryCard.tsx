"use client";

import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

const cardSurfaceStyle: CSSProperties = {
  backgroundImage: `
    radial-gradient(ellipse 120% 80% at 8% 0%, rgba(0, 204, 153, 0.2), transparent 52%),
    radial-gradient(ellipse 100% 70% at 92% 100%, rgba(0, 204, 153, 0.14), transparent 55%),
    linear-gradient(180deg, #ffffff 0%, #ffffff 100%)
  `,
};

export interface WithdrawConfirmSummaryCardProps {
  summaryHeading: string;
  requestDateText: string;
  requestTimeText: string;
  heroAmountLabel: string;
  /** Numeric part only (commas formatted) */
  heroAmountValue: string;
  currencyCode: string;
  reviewBadgeLabel: string;
  amountToWithdrawLabel: string;
  amountToWithdrawDisplay: string;
  withdrawFeeLabel: string;
  withdrawFeeDisplay: string;
  paymentMethodLabel: string;
  paymentMethodDetail: ReactNode;
  youWillReceiveLabel: string;
  youWillReceiveDisplay: string;
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-3 border-b border-[#ececec] pb-4 last:border-b-0 last:pb-0">
      <p className="min-w-0 flex-1 text-base font-normal leading-snug text-[#989898]">{label}</p>
      <div
        className={`shrink-0 text-right text-lg font-semibold leading-snug text-[#3b3b3b] ${valueClassName ?? ""}`}
      >
        {value}
      </div>
    </div>
  );
}

export function WithdrawConfirmSummaryCard({
  summaryHeading,
  requestDateText,
  requestTimeText,
  heroAmountLabel,
  heroAmountValue,
  currencyCode,
  reviewBadgeLabel,
  amountToWithdrawLabel,
  amountToWithdrawDisplay,
  withdrawFeeLabel,
  withdrawFeeDisplay,
  paymentMethodLabel,
  paymentMethodDetail,
  youWillReceiveLabel,
  youWillReceiveDisplay,
}: WithdrawConfirmSummaryCardProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-[600px] overflow-hidden rounded-[24px] p-6 shadow-[0px_4px_22.9px_rgba(0,0,0,0.05)] md:p-6"
      style={cardSurfaceStyle}
    >
      <div className="relative z-1 flex w-full flex-col gap-6 md:gap-8">
        <div className="flex w-full min-w-0 items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
            <Image
              src="/logo.svg"
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
            <p className="text-2xl font-semibold leading-tight text-[#005d46]">{summaryHeading}</p>
            <div className="flex flex-wrap items-center justify-end gap-2 text-base font-medium text-[#3b3b3b]">
              <span>{requestDateText}</span>
              <span className="inline-block h-4 w-px shrink-0 bg-[#d6d6d6]" aria-hidden />
              <span>{requestTimeText}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-2 text-center">
          <p className="w-full text-xl font-normal leading-normal text-[#7f7f7f]">
            {heroAmountLabel}
          </p>
          <p className="text-[40px] font-semibold leading-none tracking-tight text-[#3b3b3b] md:text-[56px]">
            {heroAmountValue}
          </p>
          <span className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-[#ffd700] via-[#fcc500] to-[#f9b200] px-4 py-1 text-base font-medium text-white">
            {reviewBadgeLabel}
          </span>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Row
            label={amountToWithdrawLabel}
            value={
              <>
                <span>{amountToWithdrawDisplay}</span>{" "}
                <span className="whitespace-nowrap">{currencyCode}</span>
              </>
            }
          />
          <Row
            label={withdrawFeeLabel}
            value={
              <>
                <span>{withdrawFeeDisplay}</span>{" "}
                <span className="whitespace-nowrap">{currencyCode}</span>
              </>
            }
          />
          <div className="flex w-full min-w-0 items-start gap-3 border-b border-[#ececec] pb-4 last:border-b-0 last:pb-0">
            <p className="min-w-0 flex-1 text-base font-normal leading-snug text-[#989898]">
              {paymentMethodLabel}
            </p>
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 text-right text-lg font-semibold text-[#3b3b3b]">
              {paymentMethodDetail}
            </div>
          </div>
          <div className="mt-3 flex w-full min-w-0 flex-wrap items-end justify-between gap-3 border-t border-[#ececec] pt-5">
            <p className="min-w-0 flex-1 text-base font-normal leading-snug text-[#3b3b3b]">
              {youWillReceiveLabel}
            </p>
            <p className="shrink-0 text-right text-[26px] font-semibold leading-tight text-[#00cc99] md:text-[32px]">
              {youWillReceiveDisplay} {currencyCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WithdrawConfirmBankMethodDetail({
  accountLast4,
  bankLabel,
}: {
  accountLast4: string;
  bankLabel: string;
}) {
  return (
    <>
      <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 22, color: "#3b3b3b" }} />
      <span className="whitespace-nowrap">
        <span className="text-black">{bankLabel}</span>{" "}
        <span className="text-[#3b3b3b]">***{accountLast4}</span>
      </span>
    </>
  );
}
