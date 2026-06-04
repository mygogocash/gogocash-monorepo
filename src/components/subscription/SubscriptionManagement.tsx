"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSubscriptionPlan,
  getSubscriptionDetail,
  getSubscriptionPlans,
  getSubscriptions,
  getSubscriptionStats,
  postSubscriptionPlan,
  putSubscriptionAction,
  putSubscriptionPlan,
} from "@/lib/api/adminModulesApi";
import type { Subscription, SubscriptionPlan } from "@/types/adminModules";
import { formatDate } from "@/lib/dateFormat";
import { formatMoney } from "@/lib/currencyFormat";
import { planCycle, CYCLE_LABEL, CYCLE_BADGE } from "@/lib/subscriptionCycle";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

/** Colored top-border accent per billing cycle (mirrors Membership tier colors). */
const PLAN_ACCENT: Record<SubscriptionPlan["billingCycle"], string> = {
  monthly: "#3b82f6", // blue-500
  quarterly: "#f59e0b", // amber-500
  annual: "#8b5cf6", // violet-500
};

/** Status pill colors (same palette as the Membership status badge). */
const PLAN_STATUS_BADGE: Record<SubscriptionPlan["status"], string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

/** Per-cycle unit word for the price line ("149 THB / month"). */
const CYCLE_UNIT: Record<SubscriptionPlan["billingCycle"], string> = {
  monthly: "month",
  quarterly: "quarter",
  annual: "year",
};

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
  const [planModal, setPlanModal] = useState<false | "create" | SubscriptionPlan>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
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
    queryKey: ["admin", "subscription", "subs", page],
    queryFn: () => getSubscriptions({ page, limit: 10 }),
  });
  const detailQ = useQuery({
    queryKey: ["admin", "subscription", "detail", detailId],
    queryFn: () => getSubscriptionDetail(detailId!),
    enabled: Boolean(detailId),
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

  const act = useMutation({
    mutationFn: ({
      id,
      action,
      days,
    }: {
      id: string;
      action: "cancel" | "pause" | "resume" | "extend";
      days?: number;
    }) => putSubscriptionAction(id, action, action === "extend" ? { days } : undefined),
    onSuccess: (_, v) => {
      toast.success("Updated");
      void qc.invalidateQueries({ queryKey: ["admin", "subscription", "subs"] });
      if (detailId === v.id) void qc.invalidateQueries({ queryKey: ["admin", "subscription", "detail", v.id] });
    },
  });

  // Dispatch a row action chosen from the Actions dropdown.
  const runAction = (id: string, action: string) => {
    switch (action) {
      case "view":
        setDetailId(id);
        break;
      case "pause":
      case "resume":
        void act.mutateAsync({ id, action });
        break;
      case "extend":
        void act.mutateAsync({ id, action: "extend", days: 30 });
        break;
      case "cancel":
        if (confirm("Cancel subscription?"))
          void act.mutateAsync({ id, action: "cancel" });
        break;
    }
  };

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
          <Button
            size="sm"
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
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
              style={{
                borderTopColor: PLAN_ACCENT[p.billingCycle],
                borderTopWidth: 4,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm capitalize text-gray-600 dark:text-gray-400">
                    {p.billingCycle} plan
                  </p>
                </div>
                <span
                  className={`${STATUS_BADGE_BASE} ${PLAN_STATUS_BADGE[p.status]}`}
                >
                  {p.status}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Price</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {formatMoney(p.price)} / {CYCLE_UNIT[p.billingCycle]}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Trial</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {p.trialDays} days
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">
                    Grace period
                  </dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {p.gracePeriodDays} days
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">
                    Subscribers
                  </dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-200">
                    {p.subscriberCount.toLocaleString()}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft(p);
                    setPlanModal(p);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("Delete plan?")) void delPlan.mutateAsync(p.id);
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subscriptions</h2>
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
                <thead className="border-b border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">User</th>
                    <th className="pb-2 pr-3 font-medium">Plan</th>
                    <th className="pb-2 pr-3 font-medium">Dates</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subsQ.data.data.map((s: Subscription) => (
                    <tr key={s.id} className="text-gray-800 dark:text-gray-200">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{s.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {s.email}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CYCLE_BADGE[planCycle(s.planName)]}`}
                        >
                          {CYCLE_LABEL[planCycle(s.planName)]}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs">
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
                      <td className="py-3 pr-3">
                        <span
                          className={`${STATUS_BADGE_BASE} ${SUB_STATUS_BADGE[s.status]}`}
                        >
                          {s.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                          value=""
                          onChange={(e) => runAction(s.id, e.target.value)}
                        >
                          <option value="" disabled hidden>
                            Actions
                          </option>
                          <option value="view">View</option>
                          <option value="pause">Pause</option>
                          <option value="resume">Resume</option>
                          <option value="extend">+30 days</option>
                          <option value="cancel">Cancel</option>
                        </select>
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

      <Modal isOpen={Boolean(detailId)} onClose={() => setDetailId(null)} className="max-w-lg p-6">
        {detailQ.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : detailQ.data ? (
          <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
            <h4 className="font-semibold text-gray-900 dark:text-white">{detailQ.data.planName}</h4>
            <p>User: {detailQ.data.userName}</p>
            <p>Status: {detailQ.data.status}</p>
            <p className="font-medium text-gray-900 dark:text-white">Billing history</p>
            <ul className="list-disc pl-5">
              {detailQ.data.billingHistory?.map((b, i) => (
                <li key={i}>
                  {formatDate(b.date)} — {formatMoney(b.amount)} ({b.status})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
