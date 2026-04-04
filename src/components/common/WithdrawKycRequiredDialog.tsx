"use client";

import { Dialog } from "@mui/material";
import { useTranslations } from "next-intl";

export type WithdrawKycRequiredDialogProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

/**
 * Figma GoGoCash 1.1 — node 9420-203558 (State Pop-Up): missing address & citizen ID before withdraw.
 */
export function WithdrawKycRequiredDialog({
  open,
  onClose,
  onContinue,
}: WithdrawKycRequiredDialogProps) {
  const t = useTranslations();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="withdraw-kyc-modal-title"
      aria-describedby="withdraw-kyc-modal-desc"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.5)" } },
      }}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "24px",
          maxWidth: "480px",
          width: "100%",
          margin: "16px",
          overflow: "hidden",
        },
      }}
    >
      <div className="flex flex-col items-center gap-8 px-6 py-8 md:gap-10 md:px-8 md:py-8">
        <div
          className="relative h-[153px] w-[150px] shrink-0 shadow-[4px_4px_8px_rgba(0,0,0,0.1)]"
          aria-hidden
        >
          <div className="absolute inset-y-0 left-0 right-[15.59%]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local Figma SVG assets */}
            <img
              src="/withdraw/kyc-modal-document.svg"
              alt=""
              width={127}
              height={153}
              className="h-full w-full object-contain object-left"
            />
          </div>
          <div className="absolute inset-[40.67%_0_11.87%_51.32%]">
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- local Figma SVG assets */}
              <img
                src="/withdraw/kyc-modal-mark.svg"
                alt=""
                width={72}
                height={72}
                className="h-full w-full object-contain"
              />
              <div className="absolute inset-[32%]">
                {/* eslint-disable-next-line @next/next/no-img-element -- local Figma SVG assets */}
                <img
                  src="/withdraw/kyc-modal-vector.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col gap-1 text-center">
            <h2
              id="withdraw-kyc-modal-title"
              className="text-[28px] font-semibold leading-tight text-[#3b3b3b] md:text-[32px]"
            >
              <span className="block">{t("withdrawKycModalTitleLine1")}</span>
              <span className="block">{t("withdrawKycModalTitleLine2")}</span>
            </h2>
            <p
              id="withdraw-kyc-modal-desc"
              className="text-base font-normal leading-normal text-[#7f7f7f] md:text-lg"
            >
              <span className="block">{t("withdrawKycModalBodyLine1")}</span>
              <span className="block">{t("withdrawKycModalBodyLine2")}</span>
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-4 md:gap-6">
            <button
              type="button"
              onClick={onClose}
              className="flex h-14 min-w-[160px] max-w-[200px] flex-1 items-center justify-center rounded-full border border-[#00cc99] bg-white px-6 text-base font-medium text-[#00cc99] transition-opacity hover:opacity-90"
            >
              {t("withdrawKycModalCancel")}
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex h-14 min-w-[160px] max-w-[200px] flex-1 items-center justify-center rounded-full bg-[#00cc99] px-6 text-base font-medium text-white transition-opacity hover:opacity-95"
            >
              {t("withdrawKycModalContinue")}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
