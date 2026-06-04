"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMembershipTier,
  getMembershipStats,
  getMembershipTiers,
  getMembershipUsers,
  postMembershipTier,
  putMembershipTier,
  putMembershipUserAction,
} from "@/lib/api/adminModulesApi";
import type { MembershipTier, UserMembership } from "@/types/adminModules";
import { formatDate } from "@/lib/dateFormat";
import { formatMoney } from "@/lib/currencyFormat";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
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
  users: (p: number, s: string) =>
    ["admin", "membership", "users", p, s] as const,
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
  const [tierModal, setTierModal] = useState<false | "create" | MembershipTier>(
    false,
  );
  const [draft, setDraft] = useState(emptyTier);
  const [detailUser, setDetailUser] = useState<UserMembership | null>(null);

  const statsQ = useQuery({ queryKey: qk.stats, queryFn: getMembershipStats });
  const tiersQ = useQuery({ queryKey: qk.tiers, queryFn: getMembershipTiers });
  const usersQ = useQuery({
    queryKey: qk.users(page, debouncedSearch),
    queryFn: () =>
      getMembershipUsers({ page, limit: 10, search: debouncedSearch }),
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

  const memberAct = useMutation({
    mutationFn: ({
      userId,
      action,
      days,
    }: {
      userId: string;
      action: "cancel" | "pause" | "resume" | "extend";
      days?: number;
    }) =>
      putMembershipUserAction(
        userId,
        action,
        action === "extend" ? { days } : undefined,
      ),
    onSuccess: () => {
      toast.success("Updated");
      void qc.invalidateQueries({ queryKey: ["admin", "membership", "users"] });
    },
  });

  // Dispatch a row action chosen from the Actions dropdown.
  const runMemberAction = (u: UserMembership, action: string) => {
    switch (action) {
      case "view":
        setDetailUser(u);
        break;
      case "pause":
      case "resume":
        void memberAct.mutateAsync({ userId: u.userId, action });
        break;
      case "extend":
        void memberAct.mutateAsync({
          userId: u.userId,
          action: "extend",
          days: 30,
        });
        break;
      case "cancel":
        if (confirm("Cancel membership?"))
          void memberAct.mutateAsync({ userId: u.userId, action: "cancel" });
        break;
    }
  };

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

  // Mock billing history for the View modal (mirrors the subscription detail):
  // a paid charge at period start and a scheduled one at expiry, at the tier price.
  const billingHistoryFor = (u: UserMembership) => {
    const amount = tiers.find((t) => t.id === u.tierId)?.monthlyPrice ?? 0;
    return [
      { date: u.startDate, amount, status: "paid" },
      { date: u.expiryDate, amount, status: "scheduled" },
    ];
  };

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Active members",
                value: stats.totalActiveMembers.toLocaleString(),
              },
              {
                label: "New members",
                value: String(stats.newThisMonth),
                sub: "This month",
              },
              { label: "Churn %", value: String(stats.churnRate) },
              {
                label: "Revenue MTD (THB)",
                value: stats.revenueMtd.toLocaleString(),
              },
            ] as { label: string; value: string; sub?: string }[]
          ).map((c) => (
            <div
              key={c.label}
              className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {c.label}
              </p>
              {c.sub && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {c.sub}
                </p>
              )}
              <p className="mt-auto pt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Membership tiers
          </h2>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t.description}
                  </p>
                </div>
                <span
                  className={`${STATUS_BADGE_BASE} ${t.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                >
                  {t.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Price</dt>
                  <dd className="text-right font-medium text-gray-800 dark:text-gray-200">
                    <div>{t.monthlyPrice.toLocaleString()} THB / month</div>
                    <div>{t.annualPrice.toLocaleString()} THB / year</div>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Cashback</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {t.cashbackRate}%
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">
                    Monthly cap
                  </dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {formatMoney(t.maxCashbackPerMonth)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Members</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {t.memberCount.toLocaleString()}
                  </dd>
                </div>
              </dl>
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
                    if (confirm(`Delete tier “${t.name}”?`))
                      void delTier.mutateAsync(t.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-20">
          <div className="flex shrink-0 items-baseline gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Members
            </h2>
            <p className="text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
              Total: {(stats?.totalActiveMembers ?? 0).toLocaleString()} active
              members
            </p>
          </div>
          <Input
            placeholder="Search name or email…"
            className="h-11 w-full sm:w-[300px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {usersQ.isLoading ? (
          <AdminTableSkeleton rows={5} />
        ) : usersQ.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            Failed to load members.
          </p>
        ) : !usersQ.data?.data.length ? (
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No members match.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="pr-3 pb-2 font-medium">User</th>
                    <th className="pr-3 pb-2 font-medium">Tier</th>
                    <th className="pr-3 pb-2 font-medium">Dates</th>
                    <th className="pr-3 pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {usersQ.data.data.map((u: UserMembership) => (
                    <tr
                      key={u.userId}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium">{u.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {u.email}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            u.tierName === "GoGoPass Plus"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {u.tierName}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        {formatDate(u.startDate)} to {formatDate(u.expiryDate)}
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Auto-renew:
                          </span>{" "}
                          {u.autoRenew ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              Yes
                            </span>
                          ) : (
                            "No"
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`${STATUS_BADGE_BASE} ${
                            u.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : u.status === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : u.status === "cancelled"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                          value=""
                          onChange={(e) => runMemberAction(u, e.target.value)}
                        >
                          <option value="" disabled hidden>
                            Actions
                          </option>
                          <option value="view">View</option>
                          <option value="pause">Pause</option>
                          <option value="resume">Resume</option>
                          <option value="cancel">Cancel</option>
                        </select>
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
        <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Tier
        </h4>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <Input
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Monthly THB
              </label>
              <Input
                type="number"
                value={String(draft.monthlyPrice)}
                onChange={(e) =>
                  setDraft({ ...draft, monthlyPrice: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Annual THB
              </label>
              <Input
                type="number"
                value={String(draft.annualPrice)}
                onChange={(e) =>
                  setDraft({ ...draft, annualPrice: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cashback %
              </label>
              <Input
                type="number"
                value={String(draft.cashbackRate)}
                onChange={(e) =>
                  setDraft({ ...draft, cashbackRate: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Max / month THB
              </label>
              <Input
                type="number"
                value={String(draft.maxCashbackPerMonth)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maxCashbackPerMonth: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Color
          </label>
          <Input
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) =>
                setDraft({ ...draft, isActive: e.target.checked })
              }
            />
            Active
          </label>
          <Button
            onClick={() => void saveTier.mutateAsync()}
            disabled={saveTier.isPending}
          >
            Save
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        className="max-w-lg p-6"
      >
        {detailUser && (
          <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {detailUser.userName}
            </h4>
            <p>Email: {detailUser.email}</p>
            <p>Tier: {detailUser.tierName}</p>
            <p>Status: {detailUser.status}</p>
            <p>
              Period: {formatDate(detailUser.startDate)} to{" "}
              {formatDate(detailUser.expiryDate)}
            </p>
            <p>Auto-renew: {detailUser.autoRenew ? "Yes" : "No"}</p>
            <p className="font-medium text-gray-900 dark:text-white">
              Billing history
            </p>
            <ul className="list-disc pl-5">
              {billingHistoryFor(detailUser).map((b, i) => (
                <li key={i}>
                  {formatDate(b.date)} — {formatMoney(b.amount)} ({b.status})
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
