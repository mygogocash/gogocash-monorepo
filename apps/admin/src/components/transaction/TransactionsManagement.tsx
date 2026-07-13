"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTransactionDetail,
  getTransactionExport,
  getTransactions,
  putTransactionFlag,
} from "@/lib/api/adminModulesApi";
import type { Transaction } from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

export default function TransactionsManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [txId, setTxId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "tx", page],
    queryFn: () => getTransactions({ page, limit: 12 }),
  });
  const detailQ = useQuery({
    queryKey: ["admin", "tx", "detail", txId],
    queryFn: () => getTransactionDetail(txId!),
    enabled: Boolean(txId),
  });

  const flag = useMutation({
    mutationFn: ({ id, flagged, reason }: { id: string; flagged: boolean; reason: string }) =>
      putTransactionFlag(id, flagged, reason),
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries({ queryKey: ["admin", "tx"] });
    },
  });

  const exportCsv = async () => {
    try {
      const { csv } = await getTransactionExport();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transactions.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch {
      toast.error(
        "Couldn't export transactions. Please try again, or contact an administrator if it continues.",
      );
    }
  };

  if (listQ.isLoading) return <AdminTableSkeleton />;

  if (listQ.isError) {
    return (
      <AdminQueryError
        title="Could not load transactions"
        onRetry={() => void listQ.refetch()}
      />
    );
  }

  const rows = listQ.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => void exportCsv()}>
          Export CSV
        </Button>
      </div>
      {!rows.length ? (
        <p className="text-sm text-gray-500">No transactions.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Tx</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Merchant</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">CB</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((t: Transaction) => (
                  <tr key={t.id} className="text-gray-800 dark:text-gray-200">
                    <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                    <td className="px-3 py-2">{t.userName}</td>
                    <td className="px-3 py-2">{t.merchantName}</td>
                    <td className="px-3 py-2 tabular-nums">{t.amount}</td>
                    <td className="px-3 py-2 tabular-nums">{t.cashbackEarned}</td>
                    <td className="px-3 py-2 capitalize">{t.type}</td>
                    <td className="px-3 py-2 capitalize">{t.status}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => setTxId(t.id)}>
                        View
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
              limit={listQ.data.limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal isOpen={Boolean(txId)} onClose={() => setTxId(null)} className="max-w-lg p-6">
        {detailQ.data ? (
          <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
            <h4 className="font-semibold text-gray-900 dark:text-white">{detailQ.data.id}</h4>
            <p>Amount: {detailQ.data.amount}</p>
            <p>Flagged: {detailQ.data.isFlagged ? "yes" : "no"}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!txId) return;
                const reason = prompt("Flag reason?") || "review";
                void flag.mutateAsync({ id: txId, flagged: true, reason });
              }}
            >
              Flag dispute
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </Modal>
    </div>
  );
}
