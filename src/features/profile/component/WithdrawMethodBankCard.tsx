"use client";

import type { DataMethodWithdraw } from "@/interfaces/withdraw";
import { useTranslations } from "next-intl";

function BankBuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 14h24v12a2 2 0 01-2 2H6a2 2 0 01-2-2V14z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M2 14L16 4l14 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18v8M16 18v8M22 18v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function maskAccountTail(accountNo: string): string {
  const digits = accountNo.replace(/\D/g, "");
  const tail = digits.slice(-4).padStart(4, "•");
  return `****${tail}`;
}

type Props = {
  method: DataMethodWithdraw;
  onSelect: () => void;
  className?: string;
};

export default function WithdrawMethodBankCard({ method, onSelect, className }: Props) {
  const t = useTranslations();
  const masked = maskAccountTail(String(method.account_no ?? ""));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex h-[183px] w-full max-w-[336px] shrink-0 flex-col items-start justify-between overflow-visible rounded-2xl border border-[#d8ede4] bg-linear-to-br from-[#f6fdfb] via-white to-[#eefbf6] px-10 py-4 text-left shadow-[0_4px_24px_rgba(0,204,153,0.08)] transition-[box-shadow,transform,border-color] duration-200 hover:border-[#b8e6d8] hover:shadow-[0_8px_28px_rgba(0,204,153,0.12)] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC99]/50 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 ${className ?? ""}`}
    >
      {method.is_default ? (
        <div className="pointer-events-none absolute right-0 top-[30px] flex items-center justify-center rounded-bl-[100px] rounded-tl-[100px] bg-[#00CC99] px-4 py-1 shadow-[0_2px_12px_rgba(0,204,153,0.35)]">
          <span className="text-center text-sm font-medium leading-normal text-white">
            {t("withdrawMethodDefaultBadge")}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <BankBuildingIcon className="shrink-0 text-[#00AA80]" />
        <div className="flex flex-col gap-1">
          <p className="text-xl font-semibold leading-snug tracking-tight text-[#103522]">
            {method.account_name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-normal leading-normal text-[#3d6b5c]">
            <span>{method.bank_name}</span>
            <span className="text-[#6b9080]" aria-hidden>
              ·
            </span>
            <span className="font-medium tabular-nums text-[#2d6a4f]">{masked}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
