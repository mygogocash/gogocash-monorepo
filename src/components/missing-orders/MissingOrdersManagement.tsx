"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@/lib/currencyFormat";
import {
  getMissingOrderDetail,
  getMissingOrders,
  getMissingOrderStats,
  postMissingOrderNote,
  putMissingOrderApprove,
  putMissingOrderAssign,
  putMissingOrderReject,
} from "@/lib/api/adminModulesApi";
import type { MissingOrderClaim } from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

export default function MissingOrdersManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const statsQ = useQuery({ queryKey: ["admin", "mo", "stats"], queryFn: getMissingOrderStats });
  const listQ = useQuery({
    queryKey: ["admin", "mo", "list", page],
    queryFn: () => getMissingOrders({ page, limit: 10 }),
  });
  const detailQ = useQuery({
    queryKey: ["admin", "mo", "detail", claimId],
    queryFn: () => getMissingOrderDetail(claimId!),
    enabled: Boolean(claimId),
  });

  const approve = useMutation({
    mutationFn: putMissingOrderApprove,
    onSuccess: () => {
      toast.success("Approved");
      void qc.invalidateQueries({ queryKey: ["admin", "mo"] });
      setClaimId(null);
    },
  });
  const reject = useMutation({
    mutationFn: putMissingOrderReject,
    onSuccess: () => {
      toast.success("Rejected");
      void qc.invalidateQueries({ queryKey: ["admin", "mo"] });
      setClaimId(null);
    },
  });
  const assign = useMutation({
    mutationFn: ({ id, assignee }: { id: string; assignee: string }) => putMissingOrderAssign(id, assignee),
    onSuccess: () => {
      toast.success("Assigned");
      void qc.invalidateQueries({ queryKey: ["admin", "mo"] });
    },
  });
  const addNote = useMutation({
    mutationFn: () => postMissingOrderNote(claimId!, note, "a1", "Admin"),
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin", "mo", "detail", claimId] });
    },
  });

  if (statsQ.isLoading || listQ.isLoading) return <AdminTableSkeleton />;

  if (statsQ.isError || listQ.isError) {
    return (
      <AdminQueryError
        title="Could not load missing orders"
        onRetry={() => {
          void statsQ.refetch();
          void listQ.refetch();
        }}
      />
    );
  }

  const stats = statsQ.data;
  const rows = listQ.data?.data ?? [];

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pending review", value: stats.pendingReview },
            { label: "Approved (week)", value: stats.approvedWeek },
            { label: "Rejected (week)", value: stats.rejectedWeek },
            { label: "Avg resolution (h)", value: stats.avgResolutionHours },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {!rows.length ? (
        <p className="py-10 text-center text-sm text-gray-500">No claims.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Claim</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((c: MissingOrderClaim) => (
                  <tr key={c.id} className="text-gray-800 dark:text-gray-200">
                    <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                    <td className="px-4 py-3">{c.userName}</td>
                    <td className="px-4 py-3">{c.merchantName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(c.orderAmount)}
                    </td>
                    <td className="px-4 py-3 capitalize">{c.status.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setClaimId(c.id)}>
                          Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void assign.mutateAsync({ id: c.id, assignee: "a1" })}>
                          Assign me
                        </Button>
                      </div>
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

      <Modal isOpen={Boolean(claimId)} onClose={() => setClaimId(null)} className="max-h-[90vh] max-w-xl overflow-y-auto p-6">
        {detailQ.data ? (
          <div className="space-y-4 text-sm text-gray-800 dark:text-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Claim {detailQ.data.id}</h4>
            <p>
              Expected cashback: {formatMoney(detailQ.data.expectedCashback)}
            </p>
            <div className="flex flex-wrap gap-2">
              {detailQ.data.evidence.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="h-24 rounded border border-gray-200 dark:border-gray-700" />
              ))}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Notes</p>
              <ul className="mt-2 space-y-1 text-xs">
                {detailQ.data.notes.map((n, i) => (
                  <li key={i}>
                    {n.timestamp}: {n.adminName} — {n.note}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note" />
                <Button size="sm" onClick={() => void addNote.mutateAsync()} disabled={!note.trim()}>
                  Add note
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void approve.mutateAsync(claimId!)}>Approve & pay</Button>
              <Button variant="outline" onClick={() => void reject.mutateAsync(claimId!)}>
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </Modal>
    </div>
  );
}
