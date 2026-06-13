"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { LinkMyCashbackVerifyCopy } from "./types";

type LinkMyCashbackVerifySuccessStepProps = {
  copy: LinkMyCashbackVerifyCopy;
  onContinue: () => void;
  onEditCode: () => void;
};

export function LinkMyCashbackVerifySuccessStep({
  copy,
  onContinue,
  onEditCode,
}: LinkMyCashbackVerifySuccessStepProps) {
  const {
    verifySuccessTitle,
    verifySuccessDescription,
    verifySuccessContinue,
    verifySuccessEditCode,
  } = copy;

  return (
    <div className="mt-10 flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircleIcon sx={{ fontSize: 64 }} className="text-[#00CC99]" aria-hidden />
        <h2
          id="link-mycashback-verify-success-heading"
          className="text-lg font-semibold leading-snug text-[#103522] sm:text-[20px]"
        >
          {verifySuccessTitle}
        </h2>
        <p className="max-w-[400px] text-sm leading-relaxed text-[#5B6B61] sm:text-[15px]">
          {verifySuccessDescription}
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="flex h-12 w-full max-w-[280px] items-center justify-center rounded-full bg-[#00CC99] px-6 text-[15px] font-bold text-white transition hover:brightness-[0.98] active:brightness-[0.95]"
        >
          {verifySuccessContinue}
        </button>
        <button
          type="button"
          onClick={onEditCode}
          className="text-sm font-medium text-[#00AA80] underline decoration-solid underline-offset-2 transition hover:text-[#008f6b]"
        >
          {verifySuccessEditCode}
        </button>
      </div>
    </div>
  );
}
