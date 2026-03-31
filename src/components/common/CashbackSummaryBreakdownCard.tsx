"use client";

import { helpTooltipMuiSlotProps } from "@/components/common/helpTooltipMuiSlotProps";
import { WithdrawHelpTooltipList } from "@/components/common/WithdrawHelpTooltipList";
import WithdrawIcon from "@/components/icons/WithdrawIcon";
import type { ResGetSummaryListCheck } from "@/interfaces/withdraw";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/utils";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import { ClickAwayListener, IconButton, Tooltip } from "@mui/material";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

/** Conversion bucket keys used when summing `totalsByStatusAndCurrency`. */
type CashbackLedgerStatus = "approved" | "pending" | "rejected";

function pickStatusTotal(
  list: ResGetSummaryListCheck | undefined,
  status: CashbackLedgerStatus,
  thai: boolean
): number {
  const row = list?.totalsByStatusAndCurrency?.find((v) => v.status === status);
  return thai ? Number(row?.totalTHB ?? 0) : Number(row?.totalUSD ?? 0);
}

/** Approved + pending + rejected conversion totals (same basis as wallet sr-only summary). */
export function getCashbackSummaryMetrics(
  list: ResGetSummaryListCheck | undefined,
  withdrawnTotal: number | undefined,
  thai: boolean
): { totalCashback: number; pendingCashback: number; withdrawn: number } {
  const approved = pickStatusTotal(list, "approved", thai);
  const pending = pickStatusTotal(list, "pending", thai);
  const rejected = pickStatusTotal(list, "rejected", thai);
  return {
    totalCashback: approved + pending + rejected,
    pendingCashback: pending,
    withdrawn: Number(withdrawnTotal ?? 0),
  };
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#42ceab] to-[#00aa80] text-white shadow-[0_2px_8px_rgba(0,170,128,0.25)]"
      aria-hidden
    >
      {children}
    </div>
  );
}

function TotalHighlight({
  icon,
  label,
  hint,
  amount,
  currency,
  compact,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  amount: number;
  currency: string;
  compact: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#00cc99]/20 bg-linear-to-br from-[#f0fdf9] to-[#f8fffc] ${compact ? "p-3.5" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <IconBadge>{icon}</IconBadge>
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold leading-snug text-[#1a1a1a] ${compact ? "text-sm" : "text-base"}`}
          >
            {label}
          </p>
          <p
            className={`mt-0.5 leading-normal text-[#7f7f7f] ${compact ? "text-[11px] leading-snug" : "text-xs"}`}
          >
            {hint}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`font-semibold tabular-nums tracking-tight text-[#00aa80] ${compact ? "text-xl" : "text-2xl sm:text-[28px]"}`}
          >
            {formatNumber(amount)}
          </span>
          <span className={`ml-1 font-medium text-[#00aa80] ${compact ? "text-xs" : "text-sm"}`}>
            {currency}
          </span>
        </div>
      </div>
    </div>
  );
}

function SupportingTile({
  icon,
  label,
  hint,
  amount,
  currency,
  compact,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  amount: number;
  currency: string;
  compact: boolean;
}) {
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-[#e8e8e8] bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${compact ? "gap-2.5 p-3.5" : "gap-3 p-4"}`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-[#f3fcf9] text-[#008f6b] ${compact ? "size-8" : "size-9"}`}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium leading-snug text-[#3b3b3b] ${compact ? "text-xs" : "text-sm"}`}
          >
            {label}
          </p>
          <p
            className={`mt-0.5 leading-normal text-[#989898] ${compact ? "text-[10px] leading-snug" : "text-xs"}`}
          >
            {hint}
          </p>
        </div>
      </div>
      <div className={`tabular-nums ${compact ? "mt-0.5" : "mt-1"}`}>
        <span
          className={`font-semibold text-[#00aa80] ${compact ? "text-lg" : "text-xl md:text-2xl"}`}
        >
          {formatNumber(amount)}
        </span>
        <span className={`ml-1 font-medium text-[#42ceab] ${compact ? "text-xs" : "text-sm"}`}>
          {currency}
        </span>
      </div>
    </div>
  );
}

export type CashbackSummaryBreakdownCardProps = {
  getListCheck: ResGetSummaryListCheck | undefined;
  withdrawnTotal: number | undefined;
  thai: boolean;
  /** `rail`: beside wallet card (Figma 8455:84556); `stacked`: full-width block */
  layout?: "stacked" | "rail";
  /** Optional callback when the withdraw link is activated (e.g. close popover). */
  onWithdrawNavigate?: () => void;
};

export function CashbackSummaryBreakdownCard({
  getListCheck,
  withdrawnTotal,
  thai,
  layout = "stacked",
  onWithdrawNavigate,
}: CashbackSummaryBreakdownCardProps) {
  const t = useTranslations();
  const currency = thai ? "THB" : "USD";
  const { totalCashback, pendingCashback, withdrawn } = getCashbackSummaryMetrics(
    getListCheck,
    withdrawnTotal,
    thai
  );

  const isRail = layout === "rail";
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] ${
        isRail ? "flex h-full min-h-[257px] w-full min-w-0 flex-1" : "w-full max-w-[916px]"
      }`}
      aria-labelledby="wallet-cashback-summary-heading"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 100% 70% at 100% 0%, rgba(0, 204, 153, 0.08) 0%, transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.9) 0%, #ffffff 100%)",
        }}
      />
      <div
        className={`relative z-10 flex w-full flex-col justify-center ${
          isRail
            ? "gap-4 px-5 py-6 md:gap-5 md:px-6 md:py-7"
            : "gap-6 px-6 py-8 md:gap-7 md:px-8 md:py-10"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id="wallet-cashback-summary-heading"
              className={`font-semibold leading-tight text-[#3b3b3b] ${
                isRail ? "text-lg md:text-xl" : "text-xl md:text-2xl"
              }`}
            >
              {t("Cashback Summary")}
            </h3>
            <p
              className={`mt-1.5 max-w-prose leading-normal text-[#7f7f7f] ${
                isRail ? "text-xs md:text-[13px]" : "text-sm"
              }`}
            >
              {t("cashbackSummaryFriendlySubtitle")}
            </p>
          </div>
          <ClickAwayListener onClickAway={() => setHelpOpen(false)}>
            <span className="inline-flex shrink-0 pt-0.5">
              <Tooltip
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                disableHoverListener
                disableFocusListener
                disableTouchListener
                title={<WithdrawHelpTooltipList />}
                placement="bottom-end"
                arrow
                enterTouchDelay={0}
                leaveTouchDelay={0}
                slotProps={helpTooltipMuiSlotProps}
              >
                <IconButton
                  type="button"
                  size="small"
                  onClick={() => setHelpOpen((open) => !open)}
                  aria-expanded={helpOpen}
                  aria-label={t("cashbackSummaryHelpAriaLabel")}
                  sx={{ p: 0.5, color: "#7f7f7f" }}
                >
                  <HelpOutlineOutlined sx={{ fontSize: isRail ? 26 : 30 }} />
                </IconButton>
              </Tooltip>
            </span>
          </ClickAwayListener>
        </div>

        <div className={`flex w-full flex-col ${isRail ? "gap-3" : "gap-4"}`}>
          <TotalHighlight
            icon={<AccountBalanceWalletOutlined sx={{ fontSize: isRail ? 18 : 22 }} />}
            label={t("Total Cashback")}
            hint={t("cashbackSummaryTotalHint")}
            amount={totalCashback}
            currency={currency}
            compact={isRail}
          />
          <div
            className={`grid min-w-0 grid-cols-1 ${isRail ? "gap-3 sm:grid-cols-2" : "gap-4 sm:grid-cols-2"}`}
          >
            <SupportingTile
              icon={<HourglassEmptyOutlined sx={{ fontSize: isRail ? 18 : 20 }} />}
              label={t("Pending Cashback")}
              hint={t("cashbackSummaryPendingHint")}
              amount={pendingCashback}
              currency={currency}
              compact={isRail}
            />
            <SupportingTile
              icon={<PaymentsOutlined sx={{ fontSize: isRail ? 18 : 20 }} />}
              label={t("Withdrawn")}
              hint={t("cashbackSummaryWithdrawnHint")}
              amount={withdrawn}
              currency={currency}
              compact={isRail}
            />
          </div>
          <div
            className={`flex w-full ${isRail ? "justify-center pt-1" : "justify-center pt-1 sm:pt-2"}`}
          >
            <Link
              href="/withdraw"
              onClick={() => onWithdrawNavigate?.()}
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#00CC99] font-medium no-underline transition hover:brightness-[0.97] ${
                isRail
                  ? "h-9 min-h-9 px-4 text-sm"
                  : "h-11 min-h-[44px] w-auto max-w-full px-6 text-base sm:h-10 sm:px-5"
              }`}
            >
              <span className="font-medium text-white">{t("Withdraw")}</span>
              <WithdrawIcon
                width={isRail ? 16 : 18}
                height={isRail ? 16 : 18}
                stroke="#ffffff"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
