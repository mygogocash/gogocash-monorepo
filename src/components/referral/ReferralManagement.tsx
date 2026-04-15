"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getReferralConfig,
  getReferralTree,
  getReferrals,
  putReferralApprove,
  putReferralConfig,
  putReferralReject,
} from "@/lib/api/adminModulesApi";
import type { Referral, ReferralConfig } from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

function ReferralConfigForm({
  initial,
  onSave,
}: {
  initial: ReferralConfig;
  onSave: (c: ReferralConfig) => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Referral program</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-xs text-gray-500">Referrer reward (THB)</label>
          <Input
            type="number"
            value={String(draft.referrerRewardValue)}
            onChange={(e) => setDraft({ ...draft, referrerRewardValue: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Referee bonus</label>
          <Input
            type="number"
            value={String(draft.refereeBonus)}
            onChange={(e) => setDraft({ ...draft, refereeBonus: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Min transaction</label>
          <Input
            type="number"
            value={String(draft.minTransactionAmount)}
            onChange={(e) => setDraft({ ...draft, minTransactionAmount: Number(e.target.value) })}
          />
        </div>
      </div>
      <Button className="mt-4" size="sm" onClick={() => onSave(draft)}>
        Save changes
      </Button>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Reward expiry: {draft.rewardExpiryDays} days.
      </p>
    </section>
  );
}

export default function ReferralManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [treeUser, setTreeUser] = useState<string | null>(null);

  const cfgQ = useQuery({ queryKey: ["admin", "ref", "cfg"], queryFn: getReferralConfig });
  const listQ = useQuery({
    queryKey: ["admin", "ref", "list", page],
    queryFn: () => getReferrals({ page, limit: 10 }),
  });
  const treeQ = useQuery({
    queryKey: ["admin", "ref", "tree", treeUser],
    queryFn: () => getReferralTree(treeUser!),
    enabled: Boolean(treeUser),
  });

  const saveCfg = useMutation({
    mutationFn: putReferralConfig,
    onSuccess: () => {
      toast.success("Config saved");
      void qc.invalidateQueries({ queryKey: ["admin", "ref", "cfg"] });
    },
  });
  const saveReferralConfig = (c: ReferralConfig) => void saveCfg.mutateAsync(c);

  const approve = useMutation({
    mutationFn: putReferralApprove,
    onSuccess: () => {
      toast.success("Approved");
      void qc.invalidateQueries({ queryKey: ["admin", "ref", "list"] });
    },
  });
  const reject = useMutation({
    mutationFn: putReferralReject,
    onSuccess: () => {
      toast.success("Rejected");
      void qc.invalidateQueries({ queryKey: ["admin", "ref", "list"] });
    },
  });

  if (cfgQ.isLoading || listQ.isLoading) return <AdminTableSkeleton />;

  if (cfgQ.isError || listQ.isError) {
    return (
      <AdminQueryError
        title="Could not load referrals"
        onRetry={() => {
          void cfgQ.refetch();
          void listQ.refetch();
        }}
      />
    );
  }

  const rows = listQ.data?.data ?? [];

  return (
    <div className="space-y-8">
      {cfgQ.data && (
        <ReferralConfigForm key={cfgQ.dataUpdatedAt} initial={cfgQ.data} onSave={saveReferralConfig} />
      )}

      <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Referee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r: Referral) => (
                <tr key={r.id} className="text-gray-800 dark:text-gray-200">
                  <td className="px-4 py-3">{r.referrerName}</td>
                  <td className="px-4 py-3">{r.refereeName}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3 text-xs">
                    R:{r.referrerRewardPaid} / F:{r.refereeRewardPaid}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setTreeUser(r.referrerId)}>
                        Tree
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void approve.mutateAsync(r.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void reject.mutateAsync(r.id)}>
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {listQ.data && (
          <div className="p-4">
            <AdminPaginationBar
              page={listQ.data.page}
              totalPages={listQ.data.totalPages}
              total={listQ.data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>

      <Modal isOpen={Boolean(treeUser)} onClose={() => setTreeUser(null)} className="max-w-md p-6">
        {treeQ.data ? (
          <div className="text-sm text-gray-800 dark:text-gray-200">
            <h4 className="font-semibold text-gray-900 dark:text-white">Referral tree</h4>
            <pre className="mt-3 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-900">
              {JSON.stringify(treeQ.data, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
      </Modal>
    </div>
  );
}
