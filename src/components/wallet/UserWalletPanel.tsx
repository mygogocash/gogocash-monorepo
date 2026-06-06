"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWalletDetail,
  postWalletAdjust,
  putWalletFreeze,
  putWalletUnfreeze,
} from "@/lib/api/adminModulesApi";
import { isValidCashbackAddition } from "@/lib/walletAdjustment";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import Switch from "@/components/form/switch/Switch";
import Input from "@/components/form/input/InputField";
import toast from "react-hot-toast";
import { useState } from "react";

type Props = {
  /** Wallet owner — the user whose balances/adjustments this panel manages. */
  userId: string;
  /** Called after a successful adjustment (e.g. to refresh related views). */
  onAdjusted?: () => void;
  /** Close the panel — fired by Cancel and after a successful Save. */
  onClose?: () => void;
};

/**
 * Self-contained wallet controls for a single user: Freeze / Unfreeze and an
 * "add extra cashback" form (credits the wallet's cashback balance for a stated
 * reason). Each addition also surfaces in the user's All Conversions table.
 * Used in the user detail (Cashback Wallet) view.
 */
export default function UserWalletPanel({
  userId,
  onAdjusted,
  onClose,
}: Props) {
  const qc = useQueryClient();
  const [adj, setAdj] = useState({ amount: "", reason: "", otherReason: "" });
  // The recorded reason: the chosen preset, or the typed text when "Others".
  const effectiveReason =
    adj.reason === "Others" ? adj.otherReason : adj.reason;

  const detailQ = useQuery({
    queryKey: ["admin", "wallet", "detail", userId],
    queryFn: () => getWalletDetail(userId),
    enabled: Boolean(userId),
  });

  const freeze = useMutation({
    mutationFn: putWalletFreeze,
    onSuccess: () => {
      toast.success("Frozen");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet"] });
    },
  });
  const unfreeze = useMutation({
    mutationFn: putWalletUnfreeze,
    onSuccess: () => {
      toast.success("Unfrozen");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet"] });
    },
  });
  const addCashback = useMutation({
    mutationFn: () =>
      postWalletAdjust(userId, {
        type: "credit",
        amount: Number(adj.amount),
        currency: "cashback",
        reason: effectiveReason,
        adminId: "admin",
      }),
    onSuccess: () => {
      toast.success("Cashback added");
      setAdj({ amount: "", reason: "", otherReason: "" });
      onAdjusted?.();
      void qc.invalidateQueries({ queryKey: ["admin", "wallet"] });
      onClose?.();
    },
  });

  if (!detailQ.data) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  const frozen = detailQ.data.wallet.status === "frozen";

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <Switch
          label="Freeze wallet"
          defaultChecked={frozen}
          activeLabelClassName="text-brand-500 dark:text-brand-400"
          onChange={(checked) =>
            void (checked ? freeze : unfreeze).mutateAsync(userId)
          }
        />
        <div className="mt-4 flex flex-wrap items-baseline gap-2">
          <p className="font-medium text-gray-900 dark:text-white">
            Add extra cashback
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Credits the cashback balance for a specific reason.
          </p>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            type="number"
            placeholder="Amount"
            value={adj.amount}
            onChange={(e) => setAdj({ ...adj, amount: e.target.value })}
          />
          <select
            className="focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            value={adj.reason}
            onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
          >
            <option value="">Reason (required)</option>
            <option value="Giveaway">Giveaway</option>
            <option value="Reward">Reward</option>
            <option value="Others">Others</option>
          </select>
        </div>
        {adj.reason === "Others" && (
          <Input
            className="mt-2"
            placeholder="Type the reason"
            value={adj.otherReason}
            onChange={(e) => setAdj({ ...adj, otherReason: e.target.value })}
          />
        )}
        <div className="mt-2 flex gap-2">
          <SecondaryButton
            onClick={() => {
              setAdj({ amount: "", reason: "", otherReason: "" });
              onClose?.();
            }}
          >
            Cancel
          </SecondaryButton>
          <SecondaryButton
            variant="blue"
            onClick={() => {
              if (!isValidCashbackAddition(adj.amount, effectiveReason)) {
                toast.error("Enter a positive amount and a reason");
                return;
              }
              if (!confirm("Add cashback to this user's wallet?")) return;
              void addCashback.mutateAsync();
            }}
          >
            Save
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
