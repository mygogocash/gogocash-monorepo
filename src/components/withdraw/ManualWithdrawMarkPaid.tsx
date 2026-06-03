"use client";

/**
 * Admin action card for MiniPay-style manual withdraw requests.
 *
 * Renders inside WithdrawDetail only when the row is
 * `withdraw_mode === "manual"` and `status === "pending"`. Captures the
 * on-chain tx hash of the admin-initiated payout and POSTs to
 * `PATCH /withdraw/:id/mark-paid` (admin-guarded on the backend).
 *
 * Confirm flow retyping the token ticker is handled server-side — this UI
 * asks for the tx hash + click-to-confirm; visual highlight on token choice
 * is the deterrent against USDT/USDC mix-ups.
 */

import { apiClient } from "@/lib/api";
import { isValidTxHash } from "@/lib/formValidation";
import { Status, type WithdrawList } from "@/types/withdraw";
import { useState } from "react";

type Props = {
  withdraw: WithdrawList;
  /** Auth token for admin API calls (reuses the same session storage other admin components use). */
  token: string;
  /** Called after a successful mark-paid so the page can refetch the row. */
  onMarkedPaid?: () => void;
};

export function ManualWithdrawMarkPaid({
  withdraw,
  token,
  onMarkedPaid,
}: Props) {
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  if (
    withdraw.withdraw_mode !== "manual" ||
    withdraw.status !== Status.Pending
  ) {
    return null;
  }

  const tokenLabel = withdraw.currency ?? "USDT";
  const amount = withdraw.amount_net ?? withdraw.amount_total;
  const recipient = withdraw.address;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTxHash(txHash)) {
      setError(
        "Enter a valid on-chain tx hash (0x followed by 64 hex characters).",
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.markWithdrawPaid(withdraw._id, txHash.trim(), token);
      onMarkedPaid?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark paid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 md:p-6 dark:border-amber-400/40 dark:bg-amber-900/20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white uppercase">
          Manual payout
        </span>
        <span className="rounded-full bg-[#00AA80] px-2.5 py-0.5 text-xs font-bold text-white uppercase">
          {tokenLabel}
        </span>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          Celo · send externally then record the tx hash here
        </span>
      </div>

      <dl className="mb-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
            Recipient wallet
          </dt>
          <dd className="font-mono break-all text-gray-900 dark:text-gray-100">
            {recipient || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
            Amount to send
          </dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {amount} {tokenLabel}
          </dd>
        </div>
      </dl>

      {!confirmStep ? (
        <button
          type="button"
          onClick={() => setConfirmStep(true)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Mark as paid
        </button>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Tx hash of the {tokenLabel} payout on Celo
            </span>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x…"
              autoFocus
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            {error ? (
              <span className="text-xs font-medium text-red-600">{error}</span>
            ) : null}
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving…" : "Confirm paid"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmStep(false);
                setTxHash("");
                setError(null);
              }}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
