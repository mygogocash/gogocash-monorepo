"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/dateFormat";
import { formatMoney } from "@/lib/currencyFormat";
import {
  ConversionQuery,
  DataConversion,
  ResponseConversion,
} from "@/types/api";
import { useDataSession } from "@/hooks/useDataSession";
import client from "@/lib/axios/client";
import { Modal } from "@/components/ui/modal";
import NoData from "@/components/common/NoData";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { devError } from "@/lib/devConsole";
import { validateOptionalAmount } from "@/lib/formValidation";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
  { value: "yet to consume", label: "Yet to consumed" },
  { value: "invalid", label: "Invalid" },
];

export default function CreatedConversionTable() {
  const session = useDataSession();
  const { loading, error, getCreatedConversions, clearError } = useApi();
  const [lists, setLists] = useState<ResponseConversion>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [query] = useState<ConversionQuery>({ limit: 10, page: 1 });
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [updateModal, setUpdateModal] = useState<DataConversion | null>(null);
  const [editForm, setEditForm] = useState({
    conversion_status: "",
    sale_amount: "",
    payout: "",
    adv_sub2: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchList = async (page = 1) => {
    try {
      const res = await getCreatedConversions(
        { ...query, page, limit: query.limit ?? 10 },
        session?.accessToken ?? "",
      );
      setLists(res);
      setPagination({
        page: res.pagination.page,
        limit: res.pagination.limit,
        total: res.pagination.total,
        totalPages: res.pagination.totalPages,
      });
    } catch (err) {
      devError("Failed to fetch created conversions:", err);
    }
  };

  useEffect(() => {
    fetchList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(e.target as Node)
      )
        setOpenActionsId(null);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openActionsId]);

  const formatDate = (dateString?: string) =>
    formatDateTime(dateString, { fallback: "N/A" });

  const formatPrice = (price?: number, currency?: string) =>
    formatMoney(price, currency || "USD", { decimals: 2 });

  const openUpdateModal = (row: DataConversion) => {
    setUpdateModal(row);
    setEditForm({
      conversion_status: row.conversion_status ?? "pending",
      sale_amount: row.sale_amount ?? "",
      payout: row.payout ?? "",
      adv_sub2: row.adv_sub2 ?? "",
      remark: (row as DataConversion & { remark?: string }).remark ?? "",
    });
  };

  const handleSaveUpdate = async () => {
    if (!updateModal || !session?.accessToken) return;
    const amountError =
      validateOptionalAmount(editForm.sale_amount, "Sale amount") ||
      validateOptionalAmount(editForm.payout, "Payout", true);
    if (amountError) {
      alert(amountError);
      return;
    }
    setSaving(true);
    try {
      await client.patch(
        `/admin/update-conversion/${updateModal.conversion_id}`,
        {
          conversion_status: editForm.conversion_status || undefined,
          sale_amount: editForm.sale_amount
            ? Number(editForm.sale_amount)
            : undefined,
          payout: editForm.payout ? Number(editForm.payout) : undefined,
          adv_sub2: editForm.adv_sub2 || undefined,
          remark: editForm.remark || undefined,
        },
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      setUpdateModal(null);
      fetchList(pagination.page);
    } catch (err) {
      devError("Failed to update conversion:", err);
      alert("Failed to update conversion");
    } finally {
      setSaving(false);
    }
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Created Conversion
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conversions added via Add conversion. Update status and info below.
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total: {pagination.total}
        </p>
      </div>
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button
              onClick={clearError}
              className="text-red-800 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading…
            </span>
          </div>
        )}
        {!loading && (
          <>
            <div className="min-w-0 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Offer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Detail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Remark
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {lists?.data?.map((list, index) => (
                    <tr
                      key={list.conversion_id}
                      title="Click row for quick view"
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => {
                        setOpenActionsId(null);
                        openUpdateModal(list);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {list.offer_name} ({list.conversion_id})
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          date: {formatDate(String(list.datetime_conversion))}
                          <br />
                          updated: {formatDate(String(list.updatedAt))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          sale:{" "}
                          {formatPrice(Number(list.sale_amount), list.currency)}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          payout:{" "}
                          {formatPrice(Number(list.payout), list.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {list.aff_sub1 ??
                          list?.user?.username ??
                          list?.user?.email ??
                          "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {list.adv_sub1} / {list.adv_sub2}
                      </td>
                      <td className="max-w-[12rem] px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {(list as DataConversion & { remark?: string })
                          .remark ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            list.conversion_status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                              : list.conversion_status === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                : list.conversion_status === "rejected"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {list.conversion_status}
                        </span>
                      </td>
                      <td className="relative px-6 py-4 whitespace-nowrap">
                        <div
                          ref={
                            openActionsId === String(list.conversion_id)
                              ? actionsDropdownRef
                              : undefined
                          }
                          className="relative inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const id = String(list.conversion_id);
                              setOpenActionsId((prev) =>
                                prev === id ? null : id,
                              );
                            }}
                            className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            aria-expanded={
                              openActionsId === String(list.conversion_id)
                            }
                            aria-haspopup="true"
                          >
                            Actions
                            <svg
                              className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          {openActionsId === String(list.conversion_id) && (
                            <div
                              className="absolute top-full right-auto left-0 z-50 mt-1 max-w-[min(18rem,calc(100vw-1.5rem))] min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:right-0 sm:left-auto sm:max-w-none dark:border-gray-600 dark:bg-gray-800"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionsId(null);
                                  openUpdateModal(list);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Update
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchList(pagination.page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchList(pagination.page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {Number(lists?.pagination?.total) === 0 && !loading && (
              <NoData>
                No created conversions yet. Add one from the Add conversion
                page.
              </NoData>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={!!updateModal}
        onClose={() => setUpdateModal(null)}
        className="max-w-[500px] p-5 lg:p-8"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Update conversion
          </h4>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUpdateModal(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveUpdate} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              value={editForm.conversion_status}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  conversion_status: e.target.value,
                }))
              }
              className="focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sale amount
            </label>
            <Input
              type="number"
              step="0.01"
              value={editForm.sale_amount}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, sale_amount: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payout
            </label>
            <Input
              type="number"
              step="0.01"
              value={editForm.payout}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, payout: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Order ID
            </label>
            <Input
              type="text"
              value={editForm.adv_sub2}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, adv_sub2: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Remark
            </label>
            <Input
              type="text"
              placeholder="Optional"
              value={editForm.remark}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, remark: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
