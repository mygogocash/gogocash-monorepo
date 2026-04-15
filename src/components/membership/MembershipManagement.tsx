"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMembershipTier,
  getMembershipStats,
  getMembershipTiers,
  getMembershipUsers,
  postMembershipTier,
  putMembershipTier,
  putMembershipUserCancel,
  putMembershipUserTier,
} from "@/lib/api/adminModulesApi";
import type { MembershipTier, UserMembership } from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const qk = {
  stats: ["admin", "membership", "stats"] as const,
  tiers: ["admin", "membership", "tiers"] as const,
  users: (p: number, s: string) => ["admin", "membership", "users", p, s] as const,
};

const emptyTier: Omit<MembershipTier, "id" | "memberCount"> = {
  name: "",
  description: "",
  monthlyPrice: 0,
  annualPrice: 0,
  color: "#64748b",
  icon: "star",
  benefits: [],
  cashbackRate: 5,
  maxCashbackPerMonth: 10000,
  isActive: true,
};

export default function MembershipManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);
  const [tierModal, setTierModal] = useState<false | "create" | MembershipTier>(false);
  const [draft, setDraft] = useState(emptyTier);

  const statsQ = useQuery({ queryKey: qk.stats, queryFn: getMembershipStats });
  const tiersQ = useQuery({ queryKey: qk.tiers, queryFn: getMembershipTiers });
  const usersQ = useQuery({
    queryKey: qk.users(page, debouncedSearch),
    queryFn: () => getMembershipUsers({ page, limit: 10, search: debouncedSearch }),
  });

  const saveTier = useMutation({
    mutationFn: async () => {
      if (tierModal === "create") {
        await postMembershipTier({ ...draft, memberCount: 0 });
      } else if (typeof tierModal === "object" && tierModal.id) {
        await putMembershipTier(tierModal.id, draft);
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: qk.tiers });
      setTierModal(false);
    },
    onError: () => toast.error("Save failed"),
  });

  const delTier = useMutation({
    mutationFn: deleteMembershipTier,
    onSuccess: () => {
      toast.success("Tier removed");
      void qc.invalidateQueries({ queryKey: qk.tiers });
    },
    onError: () => toast.error("Delete failed"),
  });

  const changeTier = useMutation({
    mutationFn: ({ userId, tierId }: { userId: string; tierId: string }) =>
      putMembershipUserTier(userId, tierId),
    onSuccess: () => {
      toast.success("Tier updated");
      void qc.invalidateQueries({ queryKey: ["admin", "membership", "users"] });
    },
  });

  const cancelSub = useMutation({
    mutationFn: putMembershipUserCancel,
    onSuccess: () => {
      toast.success("Marked cancelled");
      void qc.invalidateQueries({ queryKey: ["admin", "membership", "users"] });
    },
  });

  if (statsQ.isLoading || tiersQ.isLoading) return <AdminTableSkeleton />;

  if (statsQ.isError || tiersQ.isError) {
    return (
      <AdminQueryError
        title="Could not load membership"
        onRetry={() => {
          void statsQ.refetch();
          void tiersQ.refetch();
        }}
      />
    );
  }

  const stats = statsQ.data;
  const tiers = tiersQ.data ?? [];

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active members", value: stats.totalActiveMembers.toLocaleString() },
            { label: "Revenue MTD (THB)", value: stats.revenueMtd.toLocaleString() },
            { label: "Churn %", value: String(stats.churnRate) },
            { label: "New this month", value: String(stats.newThisMonth) },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Membership tiers</h2>
          <Button
            size="sm"
            onClick={() => {
              setDraft(emptyTier);
              setTierModal("create");
            }}
          >
            + Add tier
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
              style={{ borderTopColor: t.color, borderTopWidth: 4 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t.description}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${t.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                >
                  {t.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>฿{t.monthlyPrice}/mo · ฿{t.annualPrice}/yr</li>
                <li>Cashback {t.cashbackRate}% · Cap ฿{t.maxCashbackPerMonth.toLocaleString()}/mo</li>
                <li>{t.memberCount} members</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft({
                      name: t.name,
                      description: t.description,
                      monthlyPrice: t.monthlyPrice,
                      annualPrice: t.annualPrice,
                      color: t.color,
                      icon: t.icon,
                      benefits: t.benefits,
                      cashbackRate: t.cashbackRate,
                      maxCashbackPerMonth: t.maxCashbackPerMonth,
                      isActive: t.isActive,
                    });
                    setTierModal(t);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Delete tier “${t.name}”?`)) void delTier.mutateAsync(t.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search name or email…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {usersQ.isLoading ? (
          <AdminTableSkeleton rows={5} />
        ) : usersQ.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">Failed to load members.</p>
        ) : !usersQ.data?.data.length ? (
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">No members match.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">User</th>
                    <th className="pb-2 pr-3 font-medium">Tier</th>
                    <th className="pb-2 pr-3 font-medium">Dates</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {usersQ.data.data.map((u: UserMembership) => (
                    <tr key={u.userId} className="text-gray-800 dark:text-gray-200">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{u.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </td>
                      <td className="py-3 pr-3">{u.tierName}</td>
                      <td className="py-3 pr-3 text-xs">
                        {u.startDate} → {u.expiryDate}
                        <div>Auto-renew: {u.autoRenew ? "Yes" : "No"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize dark:bg-gray-800">
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <select
                            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                            defaultValue={u.tierId}
                            onChange={(e) => {
                              void changeTier.mutateAsync({ userId: u.userId, tierId: e.target.value });
                            }}
                          >
                            {tiers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Cancel membership for ${u.userName}?`))
                                void cancelSub.mutateAsync(u.userId);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersQ.data && (
              <AdminPaginationBar
                page={usersQ.data.page}
                totalPages={usersQ.data.totalPages}
                total={usersQ.data.total}
                onPageChange={(p) => setPage(p)}
              />
            )}
          </>
        )}
      </section>

      <Modal
        isOpen={Boolean(tierModal)}
        onClose={() => setTierModal(false)}
        className="max-h-[90vh] max-w-lg overflow-y-auto p-6"
      >
        <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Tier</h4>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly THB</label>
              <Input
                type="number"
                value={String(draft.monthlyPrice)}
                onChange={(e) => setDraft({ ...draft, monthlyPrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Annual THB</label>
              <Input
                type="number"
                value={String(draft.annualPrice)}
                onChange={(e) => setDraft({ ...draft, annualPrice: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cashback %</label>
              <Input
                type="number"
                value={String(draft.cashbackRate)}
                onChange={(e) => setDraft({ ...draft, cashbackRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max / month THB</label>
              <Input
                type="number"
                value={String(draft.maxCashbackPerMonth)}
                onChange={(e) => setDraft({ ...draft, maxCashbackPerMonth: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
          <Input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Active
          </label>
          <Button onClick={() => void saveTier.mutateAsync()} disabled={saveTier.isPending}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
