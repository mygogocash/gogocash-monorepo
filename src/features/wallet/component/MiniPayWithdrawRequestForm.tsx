"use client";

/**
 * MiniPay manual-withdraw request form.
 *
 * MiniPay users can't sign on-chain txs themselves (the wallet is custodial
 * inside the mini-app). Instead they submit a request — admin sends USDT or
 * USDC on Celo externally and marks the row paid. See
 * `gogocash_api/src/withdraw/withdraw.service.ts::createManualWithdrawRequest`.
 *
 * Email is required (hard gate, server-enforced). If the session has no
 * email we render `MiniPayEmailModal` as an overlay until one is saved, then
 * the form becomes interactive.
 *
 * Figma: MiniPay flow is detect-and-adapt of the existing `/withdraw` route;
 * this component replaces the multi-chain on-chain UI when `useIsInMiniPay()`
 * or `useIsWalletUser()` is true.
 */

import { MiniPayEmailModal } from "@/features/auth/component/MiniPayEmailModal";
import { useRouter } from "@/i18n/navigation";
import {
  createManualWithdrawRequest,
  type ManualWithdrawCurrency,
} from "@/lib/services/withdraw";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

function maskAddress(addr: string | undefined): string {
  if (!addr) return "";
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function MiniPayWithdrawRequestForm() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session } = useSession();

  const walletAddress = session?.user?.wallet ?? "";
  const emailMissing = !session?.user?.email?.trim();

  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<ManualWithdrawCurrency>("USDT");

  const amount = useMemo(() => {
    const n = Number(amountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const submit = useMutation({
    mutationFn: () =>
      createManualWithdrawRequest({
        address: walletAddress,
        currency,
        amount,
      }),
    onSuccess: () => {
      toast.success(t("minipayWithdrawRequestedToast"));
      router.replace("/");
    },
    onError: (err) => {
      // Backend returns 409 with a specific pending-request message; surface it verbatim.
      if (isAxiosError(err) && err.response?.status === 409) {
        const msg = (err.response.data as { message?: string } | undefined)?.message;
        toast.error(msg ?? t("minipayWithdrawAlreadyPendingToast"));
        return;
      }
      toast.error(t("minipayWithdrawRequestFailedToast"));
    },
  });

  const canSubmit =
    !emailMissing && !!walletAddress && amount > 0 && !submit.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    submit.mutate();
  };

  return (
    <>
      {emailMissing ? <MiniPayEmailModal /> : null}

      <section
        className="mx-auto w-full max-w-[520px] px-4 py-8 md:px-8 md:py-12"
        aria-labelledby="minipay-withdraw-heading"
      >
        <div className="rounded-3xl border border-[#E4EAE6] bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h1
              id="minipay-withdraw-heading"
              className="text-[24px] font-semibold leading-tight text-[#00CC99]"
            >
              {t("minipayWithdrawTitle")}
            </h1>
            <p className="text-[14px] leading-relaxed text-[#5B6B61]">
              {t("minipayWithdrawDescription")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
            {/* Wallet address (read-only, pulled from session). */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-[#103522]">
                {t("minipayWithdrawPayoutTo")}
              </span>
              <div className="flex h-[52px] items-center rounded-2xl border border-[#E4EAE6] bg-[#F8FAF9] px-4 text-[14px] font-mono text-[#103522]">
                {walletAddress ? maskAddress(walletAddress) : t("minipayWithdrawNoWallet")}
              </div>
              <span className="text-[12px] text-[#7A8B81]">
                {t("minipayWithdrawChainBadge")}
              </span>
            </div>

            {/* Currency picker — USDT / USDC on Celo. */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-[#103522]">
                {t("minipayWithdrawTokenLabel")}
              </span>
              <div
                role="radiogroup"
                aria-label={t("minipayWithdrawTokenLabel")}
                className="grid grid-cols-2 gap-3"
              >
                {(["USDT", "USDC"] as const).map((opt) => {
                  const active = currency === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setCurrency(opt)}
                      className={[
                        "flex h-[52px] items-center justify-center rounded-2xl border bg-white px-4 text-[15px] font-semibold transition",
                        active
                          ? "border-[#00CC99] text-[#00CC99] shadow-[0_0_0_1px_#00CC99_inset]"
                          : "border-[#E4EAE6] text-[#103522] hover:border-[#00CC99]/50",
                      ].join(" ")}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount. */}
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-[#103522]">
                {t("minipayWithdrawAmountLabel", { token: currency })}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="h-[52px] w-full rounded-2xl border border-[#E4EAE6] bg-white px-4 text-[15px] text-[#103522] outline-none transition focus:border-[#00CC99] focus:ring-2 focus:ring-[#00CC99]/20"
              />
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex h-12 items-center justify-center rounded-full bg-[#00CC99] px-6 text-[15px] font-semibold text-white transition hover:brightness-[0.98] active:brightness-[0.95] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submit.isPending
                ? t("minipayWithdrawSubmitting")
                : t("minipayWithdrawSubmit")}
            </button>

            <p className="text-center text-[12px] leading-snug text-[#7A8B81]">
              {t("minipayWithdrawFooterNote")}
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
