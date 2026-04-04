"use client";

import WithdrawIcon from "@/components/icons/WithdrawIcon";
import type { ResponseWithdrawCheck } from "@/interfaces/withdraw";
import { Link } from "@/i18n/navigation";
import { combineAvailableBalance } from "@/lib/withdraw/combineAvailableBalance";
import { checkThai, cn, formatAddress, formatCashDisplay } from "@/lib/utils";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

/** Latest fee timestamp when present; otherwise `null` (avoid misleading “now”). */
export function getWithdrawCheckLastUpdatedAt(
  getCheck: ResponseWithdrawCheck | undefined
): Date | null {
  const feeUpdatedAtGogo = getCheck?.fee?.updatedAt
    ? new Date(getCheck.fee.updatedAt).getTime()
    : 0;
  const feeUpdatedAtMcb = getCheck?.MCBCashback?.fee?.updatedAt
    ? new Date(getCheck.MCBCashback.fee.updatedAt).getTime()
    : 0;
  if (feeUpdatedAtGogo <= 0 && feeUpdatedAtMcb <= 0) {
    return null;
  }
  return new Date(Math.max(feeUpdatedAtGogo, feeUpdatedAtMcb));
}

function formatPopperLastUpdated(
  date: Date,
  locale: string
): { dateLine: string; timeLine: string } {
  const loc = locale === "th" ? "th-TH" : "en-GB";
  const dateLine = new Intl.DateTimeFormat(loc, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const timeLine = new Intl.DateTimeFormat(loc, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { dateLine, timeLine };
}

function maskWalletTail(wallet: string | undefined): string {
  const w = (wallet || "").replace(/\s/g, "");
  if (w.length < 4) {
    return "****";
  }
  return `***${w.slice(-4)}`;
}

type Variant = "popper" | "page";

export function WalletSummaryHeroCard({
  variant = "popper",
  getCheck,
  onWithdrawNavigate,
  className,
}: {
  variant?: Variant;
  getCheck: ResponseWithdrawCheck | undefined;
  onWithdrawNavigate?: () => void;
  /** Merged onto the outer shell (e.g. `max-w-none w-full` for profile hub). */
  className?: string;
}) {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();

  const displayName =
    (session?.user?.username != "undefined" && session?.user?.username) ||
    (session?.user?.wallet != "undefined" && session?.user?.wallet
      ? formatAddress(session.user.wallet)
      : null) ||
    "USER";

  const walletRaw = session?.user?.wallet;
  const maskedId = maskWalletTail(
    typeof walletRaw === "string" && walletRaw !== "undefined" ? walletRaw : undefined
  );

  const thai = checkThai || session?.user?.region === "Thailand";
  const currency = thai ? "THB" : "USD";
  const totalAvailable = combineAvailableBalance(getCheck, thai);

  const feeUpdated = getWithdrawCheckLastUpdatedAt(getCheck);
  const lastUpdatedFormatted =
    feeUpdated != null ? formatPopperLastUpdated(feeUpdated, locale) : null;

  const shellClass = cn(
    variant === "page"
      ? "relative h-[257px] w-full max-w-[352px] shrink-0 overflow-hidden rounded-[13px] shadow-[0px_4px_24px_rgba(0,0,0,0.15)]"
      : "relative h-[260px] w-full max-w-[352px] shrink-0 overflow-hidden rounded-[13px] shadow-[3px_-2px_4px_rgba(0,0,0,0.05)]",
    className
  );

  const amountClass = "text-[40px] font-semibold leading-none tracking-tight";

  return (
    <div className={shellClass}>
      <Image
        src="/profile/back_wallet.svg"
        alt=""
        fill
        className="pointer-events-none object-cover object-center"
        sizes={
          variant === "page"
            ? "352px"
            : "(max-width: 768px) min(100vw, 480px), 352px"
        }
        priority={false}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-linear-to-b from-[#00AA80] from-25% via-[#00AA80]/75 to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col">
        {variant === "page" ? (
          <div className="shrink-0 bg-[#00AA80] px-[18px] pb-3 pt-4 shadow-[3px_-2px_4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-white/15">
                <Image
                  src="/logo.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="size-full object-cover"
                  sizes="32px"
                />
              </div>
              <p className="shrink-0 text-[17.686px] font-semibold leading-normal text-white">
                {t("Wallet")}
              </p>
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-[#00AA80] px-[18px] pb-3 pt-4 shadow-[3px_-2px_4px_rgba(0,0,0,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div className="relative size-[52px] shrink-0 overflow-hidden rounded-full bg-[#ffdbe3]">
                <Image
                  src="/profile.png"
                  alt=""
                  width={192}
                  height={192}
                  sizes="52px"
                  quality={92}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-col items-end gap-1 text-right whitespace-nowrap">
                <p
                  className="text-base font-medium leading-normal text-white"
                  style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
                >
                  {displayName}
                </p>
                <p className="text-xs font-normal leading-normal text-[#83F2D6]">{maskedId}</p>
              </div>
            </div>
          </div>
        )}

        <div
          className={`relative flex min-h-0 flex-1 flex-col rounded-t-[16px] rounded-b-[13px] border border-white/40 bg-white/20 px-5 backdrop-blur-sm -mt-2 ${
            variant === "page" ? "justify-center pb-4 pt-3" : "pb-5 pt-4"
          }`}
        >
          <div
            className={`flex w-full flex-col items-center text-[#3B3B3B] ${variant === "page" ? "gap-3" : "gap-4"}`}
          >
            <div className="flex w-full flex-col items-center gap-1 text-center">
              <p className="w-full text-xs font-normal leading-normal">
                {t("Total Cashback Available")}
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className={amountClass}>{formatCashDisplay(totalAvailable)}</span>
                <span className="text-lg font-semibold leading-none">{currency}</span>
              </div>
              {lastUpdatedFormatted ? (
                <div className="flex flex-wrap items-center justify-center gap-1 text-xs font-normal text-[#3B3B3B]">
                  <span>{t("profilePopperLastUpdatedPrefix")}</span>
                  <span>{lastUpdatedFormatted.dateLine}</span>
                  <span>{lastUpdatedFormatted.timeLine}</span>
                </div>
              ) : null}
            </div>
            <Link
              href="/withdraw"
              onClick={() => onWithdrawNavigate?.()}
              className="inline-flex h-11 min-h-[44px] w-full max-w-full items-center justify-center gap-2 rounded-full bg-[#00CC99] px-6 text-base font-medium text-white no-underline transition hover:brightness-[0.97] sm:h-8 sm:min-h-8 sm:w-auto sm:max-w-none sm:px-4"
            >
              <span>{t("Withdraw")}</span>
              <WithdrawIcon width={16} height={16} stroke="#ffffff" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
