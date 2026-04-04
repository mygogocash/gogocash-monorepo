"use client";

import { useTranslations } from "next-intl";

type Props = {
  onClick: () => void;
  className?: string;
};

function PlusInSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="2.25"
        y="2.25"
        width="11.5"
        height="11.5"
        rx="1.25"
        stroke="white"
        strokeWidth="1.25"
      />
      <path d="M8 5.25v5.5M5.25 8h5.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export default function WithdrawMethodsAddMintButton({ onClick, className }: Props) {
  const t = useTranslations();

  return (
    <button
      type="button"
      aria-label={t("Add Withdraw Method")}
      onClick={onClick}
      className={`flex h-10 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-full border-0 bg-[#00CC99] px-6 text-base font-medium leading-none text-white transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC99] focus-visible:ring-offset-2 ${className ?? ""}`}
    >
      <PlusInSquareIcon className="shrink-0" />
      <span className="whitespace-nowrap leading-normal">{t("withdrawMethodsEmptyAddButton")}</span>
    </button>
  );
}
