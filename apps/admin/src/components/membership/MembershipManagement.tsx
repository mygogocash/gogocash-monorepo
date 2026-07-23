"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMembershipTier,
  getMembershipStats,
  getMembershipTiers,
  getMembershipUsers,
  postMembershipTier,
  putMembershipTier,
} from "@/lib/api/adminModulesApi";
import type { MembershipTier, UserMembership } from "@/types/adminModules";
import { formatDate } from "@/lib/dateFormat";
import StatusTag from "@/components/ui/StatusTag";
import Button from "@/components/ui/button/Button";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import SearchBar from "@/components/ui/button/SearchBar";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import NoData from "@/components/common/NoData";
import MemberAdminCard from "@/components/membership/MemberAdminCard";
import SupportButton from "@/components/ui/button/SupportButton";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const qk = {
  stats: ["admin", "membership", "stats"] as const,
  tiers: ["admin", "membership", "tiers"] as const,
  users: (
    p: number,
    s: string,
    tier: string | undefined,
    filter: string,
    status: string,
  ) => ["admin", "membership", "users", p, s, tier, filter, status] as const,
};

// The Members table is scoped to GoGoPass Plus members who are active, paused, or
// previously purchased (cancelled/expired) — i.e. everyone except "pending".
const MEMBER_STATUSES = "active,paused,cancelled,expired";

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
  // Members table filter: by auto-renew (yes/no) or by status (with sub-select).
  const [memberFilter, setMemberFilter] = useState("status");
  const [memberStatus, setMemberStatus] = useState("");
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

  const statsQ = useQuery({ queryKey: qk.stats, queryFn: getMembershipStats });
  const tiersQ = useQuery({ queryKey: qk.tiers, queryFn: getMembershipTiers });
  const plusTierId = (tiersQ.data ?? []).find(
    (t) => t.name === "GoGoPass Plus",
  )?.id;
  const usersQ = useQuery({
    queryKey: qk.users(
      page,
      debouncedSearch,
      plusTierId,
      memberFilter,
      memberStatus,
    ),
    queryFn: () =>
      getMembershipUsers({
        page,
        limit: 10,
        search: debouncedSearch,
        tierId: plusTierId,
        status:
          memberFilter === "status"
            ? memberStatus || MEMBER_STATUSES
            : MEMBER_STATUSES,
        autoRenew:
          memberFilter === "autorenew-yes"
            ? "true"
            : memberFilter === "autorenew-no"
              ? "false"
              : undefined,
      }),
    enabled: Boolean(plusTierId),
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
    onError: () =>
      toast.error(
        "Couldn't save the membership tier. Please try again, or contact an administrator if it continues.",
      ),
  });

  const delTier = useMutation({
    mutationFn: deleteMembershipTier,
    onSuccess: () => {
      toast.success("Tier removed");
      void qc.invalidateQueries({ queryKey: qk.tiers });
    },
    onError: () =>
      toast.error(
        "Couldn't remove the membership tier. Please try again, or contact an administrator if it continues.",
      ),
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
              {
                label: "Churn %",
                value:
                  stats.churnRate === null
                    ? "Unavailable"
                    : String(stats.churnRate),
              },
              {
                label: "Revenue MTD (THB)",
                value:
                  stats.revenueMtd === null
                    ? "Unavailable"
                    : stats.revenueMtd.toLocaleString(),
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
          <PrimaryButton
            variant="blue"
            onClick={() => {
              setDraft(emptyTier);
              setTierModal("create");
            }}
          >
            + Add tier
          </PrimaryButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((t) => (
            <MemberAdminCard
              key={t.id}
              tier={t}
              onEdit={(tier) => {
                setDraft({
                  name: tier.name,
                  description: tier.description,
                  monthlyPrice: tier.monthlyPrice,
                  annualPrice: tier.annualPrice,
                  color: tier.color,
                  icon: tier.icon,
                  benefits: tier.benefits,
                  cashbackRate: tier.cashbackRate,
                  maxCashbackPerMonth: tier.maxCashbackPerMonth,
                  isActive: tier.isActive,
                });
                setTierModal(tier);
              }}
              onDelete={(tier) => {
                if (confirm(`Delete tier “${tier.name}”?`))
                  void delTier.mutateAsync(tier.id);
              }}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex shrink-0 items-baseline gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Membership
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              Sort by
              <SortByDropdown
                value={memberFilter}
                onChange={(e) => {
                  setMemberFilter(e.target.value);
                  setMemberStatus("");
                  setPage(1);
                }}
              >
                <option value="autorenew-yes">Auto-renew: Yes</option>
                <option value="autorenew-no">Auto-renew: No</option>
                <option value="status">Status</option>
              </SortByDropdown>
            </label>
            {memberFilter === "status" && (
              <SortByDropdown
                value={memberStatus}
                onChange={(e) => {
                  setMemberStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </SortByDropdown>
            )}
            <SearchBar
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {usersQ.isLoading ? (
          <AdminTableSkeleton rows={5} />
        ) : usersQ.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {
              "Couldn't load members. Please refresh the page, or contact an administrator if it continues."
            }
          </p>
        ) : !usersQ.data?.data.length ? (
          <NoData className="mt-8">No members match.</NoData>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Tier
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Dates
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {usersQ.data.data.map((u: UserMembership) => (
                    <tr
                      key={u.userId}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">{u.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {u.email}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            u.tierName === "GoGoPass Plus"
                              ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {u.tierName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
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
                      <td className="px-3 py-3">
                        <StatusTag
                          className={
                            u.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : u.status === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : u.status === "cancelled"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }
                        >
                          {u.status}
                        </StatusTag>
                      </td>
                      <td className="px-3 py-3">
                        <SupportButton
                          href={`/withdraw/${u.userId}?tab=subscription`}
                        >
                          View
                        </SupportButton>
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
                limit={usersQ.data.limit}
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
    </div>
  );
}
