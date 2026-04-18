"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

type AccountSetupSuccessModalProps = {
  open: boolean;
  onDone: () => void;
};

/**
 * Modal overlay shown after a PromptPay method is successfully saved.
 * Same modal for all three sub-flows (registered phone, other phone, citizen ID).
 * Figma: 9756-214495 success frame.
 */
export function AccountSetupSuccessModal({ open, onDone }: AccountSetupSuccessModalProps) {
  const t = useTranslations();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDone]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-setup-success-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-[360px] rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <CheckCircleIcon sx={{ fontSize: 64 }} className="text-[#00CC99]" aria-hidden />
          <p
            id="account-setup-success-title"
            className="whitespace-pre-line text-[18px] font-semibold leading-snug text-[#103522]"
          >
            {t("accountSetupSuccessTitle")}
          </p>
          <button
            type="button"
            onClick={onDone}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[#00CC99] px-6 text-[15px] font-bold text-white transition hover:brightness-[0.98] active:brightness-[0.95]"
            autoFocus
          >
            {t("accountSetupSuccessDone")}
          </button>
        </div>
      </div>
    </div>
  );
}
