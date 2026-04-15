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
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useState } from "react";

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            >
              <div className="flex justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                <span className="text-xs capitalize text-gray-500">{p.status}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {p.billingCycle} · ฿{p.price} · trial {p.trialDays}d
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{p.subscriberCount} subscribers</p>
              <div className="mt-3 flex gap-2">
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
                    <th className="pb-2 pr-3 font-medium">Next bill</th>
                    <th className="pb-2 pr-3 font-medium">Amount</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subsQ.data.data.map((s: Subscription) => (
                    <tr key={s.id} className="text-gray-800 dark:text-gray-200">
                      <td className="py-3 pr-3">{s.userName}</td>
                      <td className="py-3 pr-3">{s.planName}</td>
                      <td className="py-3 pr-3">{s.nextBillingDate}</td>
                      <td className="py-3 pr-3">฿{s.amount}</td>
                      <td className="py-3 pr-3 capitalize">{s.status}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailId(s.id)}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void act.mutateAsync({ id: s.id, action: "pause" })}>
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void act.mutateAsync({ id: s.id, action: "resume" })}>
                            Resume
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void act.mutateAsync({ id: s.id, action: "extend", days: 30 })}>
                            +30d
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Cancel subscription?")) void act.mutateAsync({ id: s.id, action: "cancel" });
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
                  {b.date} — ฿{b.amount} ({b.status})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
