"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptions,
  getSubscriptionStats,
  postSubscriptionPlan,
  putSubscriptionPlan,
} from "@/lib/api/adminModulesApi";
import type { Subscription, SubscriptionPlan } from "@/types/adminModules";
import { formatDate } from "@/lib/dateFormat";
import { planCycle, CYCLE_LABEL, CYCLE_BADGE } from "@/lib/subscriptionCycle";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
import Button from "@/components/ui/button/Button";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import SubAdminCard from "@/components/subscription/SubAdminCard";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import SearchBar from "@/components/ui/button/SearchBar";
import SupportButton from "@/components/ui/button/SupportButton";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

/** Colored pill per subscription status. */
const SUB_STATUS_BADGE: Record<Subscription["status"], string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  past_due: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  paused:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

export default function SubscriptionManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Subscriptions table filter: by auto-renew (yes/no) or by status (sub-select).
  const [subFilter, setSubFilter] = useState("status");
  const [subStatus, setSubStatus] = useState("");
  const [subPlan, setSubPlan] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);
  const [planModal, setPlanModal] = useState<false | "create" | SubscriptionPlan>(false);
  const [draft, setDraft] = useState<Partial<SubscriptionPlan>>({
    name: "",
    billingCycle: "monthly",
    price: 0,
    trialDays: 0,
    gracePeriodDays: 0,
    features: { cashback: true, quests: true, premiumOffers: false },
    status: "draft",
    subscriberCount: 0,
  });

  const statsQ = useQuery({ queryKey: ["admin", "subscription", "stats"], queryFn: getSubscriptionStats });
  const plansQ = useQuery({ queryKey: ["admin", "subscription", "plans"], queryFn: getSubscriptionPlans });
  const subsQ = useQuery({
    queryKey: [
      "admin",
      "subscription",
      "subs",
      page,
      debouncedSearch,
      subFilter,
      subStatus,
      subPlan,
    ],
    queryFn: () =>
      getSubscriptions({
        page,
        limit: 10,
        search: debouncedSearch,
        status: subFilter === "status" ? subStatus || undefined : undefined,
        plan: subFilter === "plan" ? subPlan || undefined : undefined,
        autoRenew:
          subFilter === "autorenew-yes"
            ? "true"
            : subFilter === "autorenew-no"
              ? "false"
              : undefined,
      }),
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      const body: SubscriptionPlan = {
        id: typeof planModal === "object" && planModal !== null && "id" in planModal ? planModal.id : `plan_${Date.now()}`,
        name: draft.name || "Untitled",
        billingCycle: draft.billingCycle ?? "monthly",
        price: Number(draft.price ?? 0),
        trialDays: Number(draft.trialDays ?? 0),
        gracePeriodDays: Number(draft.gracePeriodDays ?? 0),
        features: draft.features ?? {},
        status: draft.status ?? "draft",
        subscriberCount: draft.subscriberCount ?? 0,
      };
      if (planModal === "create") {
        await postSubscriptionPlan({ ...body, id: `plan_${Date.now()}` });
      } else if (typeof planModal === "object") {
        await putSubscriptionPlan(planModal.id, body);
      }
    },
    onSuccess: () => {
      toast.success("Plan saved");
      void qc.invalidateQueries({ queryKey: ["admin", "subscription", "plans"] });
      setPlanModal(false);
    },
    onError: () => toast.error("Failed"),
  });

  const delPlan = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      toast.success("Deleted");
      void qc.invalidateQueries({ queryKey: ["admin", "subscription", "plans"] });
    },
  });

  if (statsQ.isLoading || plansQ.isLoading) return <AdminTableSkeleton />;

  if (statsQ.isError || plansQ.isError) {
    return (
      <AdminQueryError
        title="Could not load subscriptions"
        onRetry={() => {
          void statsQ.refetch();
          void plansQ.refetch();
        }}
      />
    );
  }

  const plans = plansQ.data ?? [];

  return (
    <div className="space-y-8">
      {statsQ.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Volume today", value: statsQ.data.totalVolumeToday.toLocaleString() },
            { label: "Volume MTD", value: statsQ.data.totalVolumeMtd.toLocaleString() },
            { label: "Avg ticket", value: statsQ.data.avgTransactionValue.toLocaleString() },
            { label: "Flagged tx", value: String(statsQ.data.flaggedCount) },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <section>
        <div className="mb-4 flex justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plans</h2>
          <PrimaryButton
            variant="blue"
            onClick={() => {
              setDraft({
                name: "",
                billingCycle: "monthly",
                price: 149,
                trialDays: 7,
                gracePeriodDays: 3,
                features: { cashback: true, quests: true, premiumOffers: true },
                status: "draft",
                subscriberCount: 0,
              });
              setPlanModal("create");
            }}
          >
            + Create plan
          </PrimaryButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <SubAdminCard
              key={p.id}
              plan={p}
              onEdit={(plan) => {
                setDraft(plan);
                setPlanModal(plan);
              }}
              onDelete={(plan) => {
                if (confirm("Delete plan?")) void delPlan.mutateAsync(plan.id);
              }}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex shrink-0 items-baseline gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Subscriptions
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              Sort by
              <SortByDropdown
                value={subFilter}
                onChange={(e) => {
                  setSubFilter(e.target.value);
                  setSubStatus("");
                  setSubPlan("");
                  setPage(1);
                }}
              >
                <option value="autorenew-yes">Auto-renew: Yes</option>
                <option value="autorenew-no">Auto-renew: No</option>
                <option value="status">Status</option>
                <option value="plan">Plan</option>
              </SortByDropdown>
            </label>
            {subFilter === "status" && (
              <SortByDropdown
                value={subStatus}
                onChange={(e) => {
                  setSubStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </SortByDropdown>
            )}
            {subFilter === "plan" && (
              <SortByDropdown
                value={subPlan}
                onChange={(e) => {
                  setSubPlan(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by plan"
              >
                <option value="">All plans</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annually</option>
              </SortByDropdown>
            )}
            <SearchBar
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {subsQ.isLoading ? (
          <AdminTableSkeleton rows={5} />
        ) : subsQ.isError ? (
          <p className="mt-4 text-sm text-red-600">Failed to load.</p>
        ) : !subsQ.data?.data.length ? (
          <p className="mt-6 text-center text-sm text-gray-500">No subscriptions.</p>
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
                      Plan
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Dates
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subsQ.data.data.map((s: Subscription) => (
                    <tr key={s.id} className="text-gray-800 dark:text-gray-200">
                      <td className="px-3 py-3">
                        <div className="font-medium">{s.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {s.email}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CYCLE_BADGE[planCycle(s.planName)]}`}
                        >
                          {CYCLE_LABEL[planCycle(s.planName)]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {formatDate(s.startDate)} to{" "}
                        {formatDate(s.nextBillingDate)}
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Auto-renew:
                          </span>{" "}
                          {s.autoRenew ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              Yes
                            </span>
                          ) : (
                            "No"
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`${STATUS_BADGE_BASE} ${SUB_STATUS_BADGE[s.status]}`}
                        >
                          {s.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <SupportButton
                          href={`/withdraw/${s.userId}?tab=subscription`}
                        >
                          View
                        </SupportButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subsQ.data && (
              <AdminPaginationBar
                page={subsQ.data.page}
                totalPages={subsQ.data.totalPages}
                total={subsQ.data.total}
                limit={subsQ.data.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </section>

      <Modal isOpen={Boolean(planModal)} onClose={() => setPlanModal(false)} className="max-w-lg p-6">
        <h4 className="mb-4 font-semibold text-gray-900 dark:text-white">Plan</h4>
        <div className="space-y-3">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={draft.billingCycle}
            onChange={(e) =>
              setDraft({ ...draft, billingCycle: e.target.value as SubscriptionPlan["billingCycle"] })
            }
          >
            <option value="monthly">monthly</option>
            <option value="quarterly">quarterly</option>
            <option value="annual">annual</option>
          </select>
          <Input
            type="number"
            value={String(draft.price ?? 0)}
            onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={String(draft.trialDays ?? 0)}
              onChange={(e) => setDraft({ ...draft, trialDays: Number(e.target.value) })}
              placeholder="Trial days"
            />
            <Input
              type="number"
              value={String(draft.gracePeriodDays ?? 0)}
              onChange={(e) => setDraft({ ...draft, gracePeriodDays: Number(e.target.value) })}
              placeholder="Grace days"
            />
          </div>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as SubscriptionPlan["status"] })}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={() => void savePlan.mutateAsync()}>Save</Button>
            <Button variant="outline" onClick={() => void savePlan.mutateAsync()}>
              Publish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
