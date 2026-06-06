import { useState } from "react";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import { Modal } from "@/components/ui/modal";
import type { CashbackRequestRow } from "@/lib/cashbackRequests";

export interface CashbackApprovalNoticeProps {
  requests: readonly CashbackRequestRow[];
  resolvingId: number | null;
  onResolve: (
    conversionId: number,
    action: "approve" | "reject",
    reason?: string,
  ) => void;
}

/**
 * Inline "super-admin must respond" notice shown in the Cashback Wallet section
 * whenever an admin has filed pending "Extra cashback" requests. Approve credits
 * the wallet immediately; Reject opens a confirmation pop-up where the super
 * admin can add an optional rejection note before confirming. No credit on
 * reject. It stays easily noticed without a modal that has to be dismissed.
 */
export default function CashbackApprovalNotice({
  requests,
  resolvingId,
  onResolve,
}: CashbackApprovalNoticeProps) {
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const closeReject = () => {
    setRejectId(null);
    setReason("");
  };

  const confirmReject = () => {
    if (rejectId !== null) {
      onResolve(rejectId, "reject", reason.trim() || undefined);
    }
    closeReject();
  };

  if (requests.length === 0) return null;

  const rejecting = requests.find((r) => r.conversion_id === rejectId);

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Cashback approval needed
        </h3>
      </div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        An admin requested extra cashback for this user. Approve to credit the
        wallet, or reject to dismiss the request.
      </p>
      <ul className="space-y-2">
        {requests.map((request) => (
          <li
            key={request.conversion_id}
            className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-500/20 dark:bg-gray-900/40"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {Number(request.payout ?? 0).toFixed(2)} THB
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {request.affiliate_remarks || "No reason provided"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <SecondaryButton
                  disabled={resolvingId !== null}
                  onClick={() => setRejectId(request.conversion_id)}
                >
                  Reject
                </SecondaryButton>
                <SecondaryButton
                  variant="blue"
                  disabled={resolvingId !== null}
                  onClick={() => onResolve(request.conversion_id, "approve")}
                >
                  Approve
                </SecondaryButton>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={rejectId !== null}
        onClose={closeReject}
        className="!max-w-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Reject cashback request
        </h3>
        <p className="mt-1 mb-3 text-sm text-gray-500 dark:text-gray-400">
          {rejecting
            ? `Reject the ${Number(rejecting.payout ?? 0).toFixed(2)} THB request? Add an optional note explaining why — no cashback will be credited.`
            : "Add an optional note explaining why — no cashback will be credited."}
        </p>
        <textarea
          className="focus:border-brand-300 focus:ring-brand-500/10 min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          rows={3}
          placeholder="Rejection reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <SecondaryButton onClick={closeReject}>Cancel</SecondaryButton>
          <SecondaryButton
            variant="blue"
            disabled={resolvingId !== null}
            onClick={confirmReject}
          >
            Confirm
          </SecondaryButton>
        </div>
      </Modal>
    </div>
  );
}
