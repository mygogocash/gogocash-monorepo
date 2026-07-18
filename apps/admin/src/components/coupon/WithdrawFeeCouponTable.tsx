"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/lib/axios/client";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import NoData from "@/components/common/NoData";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/dateFormat";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";

type DiscountMode = "fixed" | "percent" | "waive";

export type WithdrawFeeCoupon = {
  _id: string;
  code: string;
  name: string;
  discount_mode: DiscountMode;
  discount_value: number;
  currency: string;
  start_at: string;
  end_at: string;
  disabled: boolean;
  quantity?: number;
  quantity_used: number;
  unlimited_quantity: boolean;
  usage_per_user: number;
};

export type WithdrawFeeCouponStatus =
  "Scheduled" | "Expired" | "Exhausted" | "Disabled" | "Active";

export function getWithdrawFeeCouponStatus(
  row: WithdrawFeeCoupon,
  now = new Date(),
): WithdrawFeeCouponStatus {
  if (row.disabled) return "Disabled";
  if (now.getTime() < new Date(row.start_at).getTime()) return "Scheduled";
  if (now.getTime() > new Date(row.end_at).getTime()) return "Expired";
  if (
    !row.unlimited_quantity &&
    row.quantity !== undefined &&
    row.quantity_used >= row.quantity
  ) {
    return "Exhausted";
  }
  return "Active";
}

const STATUS_CLASSES: Record<WithdrawFeeCouponStatus, string> = {
  Active:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  Disabled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Exhausted:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  Expired:
    "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  Scheduled:
    "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400",
};

const API_COUPON_MANAGE_ROLES = new Set(["support", "approver", "superadmin"]);

type ListResponse = {
  data: WithdrawFeeCoupon[];
  total: number;
  page: number;
  limit: number;
};

type FormState = {
  code: string;
  name: string;
  discount_mode: DiscountMode;
  discount_value: string;
  start_at: string;
  end_at: string;
  unlimited_quantity: boolean;
  quantity: string;
  usage_per_user: string;
  disabled: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  discount_mode: "fixed",
  discount_value: "10",
  start_at: new Date().toISOString().slice(0, 10),
  end_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  unlimited_quantity: true,
  quantity: "100",
  usage_per_user: "1",
  disabled: false,
};

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "GGC";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function formatDiscount(row: WithdrawFeeCoupon): string {
  if (row.discount_mode === "waive") return "Full fee waiver";
  if (row.discount_mode === "percent") return `${row.discount_value}% off fee`;
  return `${row.discount_value.toFixed(2)} ${row.currency} off fee`;
}

export default function WithdrawFeeCouponTable() {
  const permissions = usePermissions();
  const canManage =
    permissions.ready &&
    (permissions.can("coupon:manage") ||
      API_COUPON_MANAGE_ROLES.has(permissions.apiRole ?? ""));
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 25;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, isError, error } = useQuery<ListResponse>({
    queryKey: ["withdraw-fee-coupons", page, limit, debouncedSearch],
    queryFn: ({ signal }) =>
      client
        .get("/admin/withdraw-fee-coupons", {
          params: {
            limit,
            page,
            search: debouncedSearch || undefined,
          },
          signal,
        })
        .then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        discount_mode: form.discount_mode,
        discount_value:
          form.discount_mode === "waive" ? 0 : Number(form.discount_value),
        currency: "THB",
        start_at: new Date(`${form.start_at}T00:00:00.000Z`).toISOString(),
        end_at: new Date(`${form.end_at}T23:59:59.000Z`).toISOString(),
        unlimited_quantity: form.unlimited_quantity,
        quantity: form.unlimited_quantity ? undefined : Number(form.quantity),
        usage_per_user: Number(form.usage_per_user) || 1,
        disabled: form.disabled,
        applies_to: ["bank_transfer"],
      };
      return client
        .post("/admin/withdraw-fee-coupons", payload)
        .then((r) => r.data);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: ["withdraw-fee-coupons"],
      });
    },
    onError: (err) => {
      setFormError(getApiErrorMessage(err, "Could not create coupon."));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (row: WithdrawFeeCoupon) =>
      client
        .patch(`/admin/withdraw-fee-coupons/${row._id}`, {
          disabled: !row.disabled,
        })
        .then((r) => r.data),
    onMutate: () => {
      setToggleError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["withdraw-fee-coupons"],
      });
    },
    onError: (err) => {
      setToggleError(
        getApiErrorMessage(err, "Could not update this withdraw-fee coupon."),
      );
    },
  });

  const rows = data?.data ?? [];
  const loadError = useMemo(
    () =>
      isError
        ? getApiErrorMessage(
            error,
            "Couldn't load withdraw-fee coupons. Refresh or contact an admin.",
          )
        : null,
    [error, isError],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Marketing codes that discount the flat bank-transfer withdrawal fee.
        </p>
        {canManage ? (
          <button
            type="button"
            className={SUPPORT_BUTTON_CLASS}
            onClick={() => {
              setForm({ ...EMPTY_FORM, code: randomCode() });
              setFormOpen(true);
              setFormError(null);
            }}
          >
            Create fee coupon
          </button>
        ) : null}
      </div>

      <label className="block max-w-sm text-sm">
        <span className="mb-1 block text-gray-600 dark:text-gray-400">
          Search
        </span>
        <input
          aria-label="Search fee coupons"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Code or coupon name"
          role="searchbox"
          type="search"
          value={search}
        />
      </label>

      {loadError ? <p className="text-error-500 text-sm">{loadError}</p> : null}

      {toggleError ? (
        <p className="text-error-500 text-sm" role="alert">
          {toggleError}
        </p>
      ) : null}

      {formOpen ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
            New withdraw-fee coupon
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">
                Code
              </span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">
                Name
              </span>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">
                Discount mode
              </span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.discount_mode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_mode: e.target.value as DiscountMode,
                  }))
                }
              >
                <option value="fixed">Fixed THB off fee</option>
                <option value="percent">Percent off fee</option>
                <option value="waive">Full fee waiver</option>
              </select>
            </label>
            {form.discount_mode !== "waive" ? (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600 dark:text-gray-400">
                  Discount value
                </span>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discount_value: e.target.value,
                    }))
                  }
                />
              </label>
            ) : null}
            <label className="text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">
                Start date
              </span>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.start_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, start_at: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">
                End date
              </span>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.end_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, end_at: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">
                Usage per user
              </span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.usage_per_user}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    usage_per_user: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.unlimited_quantity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    unlimited_quantity: e.target.checked,
                  }))
                }
              />
              Unlimited total quantity
            </label>
            {!form.unlimited_quantity ? (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600 dark:text-gray-400">
                  Total quantity
                </span>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                />
              </label>
            ) : null}
          </div>
          {formError ? (
            <p className="text-error-500 mt-3 text-sm">{formError}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={SUPPORT_BUTTON_CLASS}
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Save coupon"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <NoData />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-white/[0.03] dark:text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium">Used</th>
                <th className="px-3 py-2 font-medium">Window</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canManage ? (
                  <th className="px-3 py-2 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row._id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="px-3 py-2 font-mono text-gray-800 dark:text-white/90">
                    {row.code}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {formatDiscount(row)}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {row.unlimited_quantity
                      ? `${row.quantity_used} / ∞`
                      : `${row.quantity_used} / ${row.quantity ?? 0}`}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {formatDate(row.start_at)} – {formatDate(row.end_at)}
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const status = getWithdrawFeeCouponStatus(row);
                      return (
                        <span
                          className={`${STATUS_BADGE_BASE} ${STATUS_CLASSES[status]}`}
                        >
                          {status}
                        </span>
                      );
                    })()}
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-brand-500 text-sm underline"
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(row)}
                      >
                        {row.disabled ? "Enable" : "Disable"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(data?.total ?? 0) > 0 ? (
        <AdminPaginationBar
          limit={limit}
          onPageChange={setPage}
          page={page}
          total={data?.total ?? 0}
          totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / limit))}
        />
      ) : null}
    </div>
  );
}
