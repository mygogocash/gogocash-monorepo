"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWalletAdjustments,
  getWalletDetail,
  getWallets,
  postWalletAdjust,
  putWalletFreeze,
  putWalletUnfreeze,
} from "@/lib/api/adminModulesApi";
import type { UserWallet, WalletAdjustment } from "@/types/adminModules";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

export default function WalletManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [adj, setAdj] = useState({
    type: "credit" as "credit" | "debit",
    amount: "",
    currency: "cashback" as WalletAdjustment["currency"],
    reason: "",
  });

  const listQ = useQuery({
    queryKey: ["admin", "wallet", "list", page],
    queryFn: () => getWallets({ page, limit: 10 }),
  });
  const detailQ = useQuery({
    queryKey: ["admin", "wallet", "detail", userId],
    queryFn: () => getWalletDetail(userId!),
    enabled: Boolean(userId),
  });
  const adjQ = useQuery({
    queryKey: ["admin", "wallet", "adj", userId],
    queryFn: () => getWalletAdjustments(userId!),
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
  const adjust = useMutation({
    mutationFn: () =>
      postWalletAdjust(userId!, {
        type: adj.type,
        amount: Number(adj.amount),
        currency: adj.currency,
        reason: adj.reason,
        adminId: "admin",
      }),
    onSuccess: () => {
      toast.success("Adjustment posted");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet"] });
    },
  });

  if (listQ.isLoading) return <AdminTableSkeleton />;

  if (listQ.isError) {
    return (
      <AdminQueryError
        title="Could not load wallets"
        onRetry={() => void listQ.refetch()}
      />
    );
  }

  const rows = listQ.data?.data ?? [];

  return (
    <div className="space-y-6">
      {!rows.length ? (
        <p className="text-sm text-gray-500">No wallets.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">GGC</th>
                  <th className="px-4 py-3 font-medium">Cashback</th>
                  <th className="px-4 py-3 font-medium">Points</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((w: UserWallet) => (
                  <tr key={w.userId} className="text-gray-800 dark:text-gray-200">
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.userName}</div>
                      <div className="text-xs text-gray-500">{w.email}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{w.ggcBalance}</td>
                    <td className="px-4 py-3 tabular-nums">{w.cashbackBalance}</td>
                    <td className="px-4 py-3 tabular-nums">{w.pointsBalance}</td>
                    <td className="px-4 py-3 capitalize">{w.status}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setUserId(w.userId)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listQ.data && (
            <AdminPaginationBar
              page={listQ.data.page}
              totalPages={listQ.data.totalPages}
              total={listQ.data.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal isOpen={Boolean(userId)} onClose={() => setUserId(null)} className="max-h-[90vh] max-w-lg overflow-y-auto p-6">
        {detailQ.data ? (
          <div className="space-y-4 text-sm">
            <h4 className="font-semibold text-gray-900 dark:text-white">{detailQ.data.wallet.userName}</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "GGC", v: detailQ.data.wallet.ggcBalance },
                { k: "Cashback", v: detailQ.data.wallet.cashbackBalance },
                { k: "Points", v: detailQ.data.wallet.pointsBalance },
              ].map((x) => (
                <div key={x.k} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500">{x.k}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{x.v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => userId && void freeze.mutateAsync(userId)}>
                Freeze
              </Button>
              <Button size="sm" variant="outline" onClick={() => userId && void unfreeze.mutateAsync(userId)}>
                Unfreeze
              </Button>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">Manual adjustment</p>
              <select
                className="mt-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={adj.type}
                onChange={(e) => setAdj({ ...adj, type: e.target.value as "credit" | "debit" })}
              >
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
              <Input
                className="mt-2"
                type="number"
                placeholder="Amount"
                value={adj.amount}
                onChange={(e) => setAdj({ ...adj, amount: e.target.value })}
              />
              <select
                className="mt-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={adj.currency}
                onChange={(e) =>
                  setAdj({ ...adj, currency: e.target.value as WalletAdjustment["currency"] })
                }
              >
                <option value="GGC">GGC</option>
                <option value="cashback">Cashback</option>
                <option value="points">Points</option>
              </select>
              <Input
                className="mt-2"
                placeholder="Reason (required)"
                value={adj.reason}
                onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
              />
              <Button
                className="mt-2"
                size="sm"
                onClick={() => {
                  if (!adj.reason.trim() || !confirm("Confirm adjustment?")) return;
                  void adjust.mutateAsync();
                }}
              >
                Post adjustment
              </Button>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Adjustment log</p>
              <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
                {(adjQ.data ?? []).map((a, i) => (
                  <li key={i}>
                    {a.timestamp}: {a.type} {a.amount} {a.currency} — {a.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </Modal>
    </div>
  );
}
