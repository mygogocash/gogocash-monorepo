"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@/lib/currencyFormat";
import { formatDate, formatDateTime } from "@/lib/dateFormat";
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
import type { DashboardInsightRangeValue } from "@/types/api";
import { DashboardInsightRangeControl } from "@/components/ecommerce/DashboardInsightRangeControl";
import { presetRangeDates } from "@/lib/insightRange";
import Button from "@/components/ui/button/Button";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import StatusTag from "@/components/ui/StatusTag";
import CopyButton from "@/components/ui/CopyButton";
import TextArea from "@/components/form/input/TextArea";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";

// Claim status → StatusTag colour (shares the badge shape; only colour varies).
const CLAIM_STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  under_review:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};
function claimStatusColor(status: string): string {
  return (
    CLAIM_STATUS_COLORS[status] ??
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
  );
}

// Segmented toggle pill (matches the offer-form "Auto apply / Manual" buttons).
const NOTE_TAB_BASE =
  "inline-flex h-7 items-center justify-center rounded-lg border px-3 text-xs transition touch-manipulation disabled:cursor-not-allowed";
function noteTabClass(active: boolean): string {
  return active
    ? `${NOTE_TAB_BASE} border-brand-500 bg-brand-500 font-medium text-white hover:bg-brand-600`
    : `${NOTE_TAB_BASE} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800`;
}

// Admin authors for note attribution (mirrors the mock admin users a1–a4).
const NOTE_AUTHORS = [
  { value: "a1", label: "admin" },
  { value: "a2", label: "moderator" },
  { value: "a3", label: "support" },
  { value: "a4", label: "analyst" },
];

// Amount rendered as the offers-table "Max cap" pattern — value on top, currency
// code below (split from the canonical formatMoney output, e.g. "1,100 THB").
function MoneyCell({ amount }: { amount: number }) {
  const formatted = formatMoney(amount);
  const i = formatted.lastIndexOf(" ");
  const value = i > 0 ? formatted.slice(0, i) : formatted;
  const currency = i > 0 ? formatted.slice(i + 1) : "";
  return (
    <>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {currency ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {currency}
        </div>
      ) : null}
    </>
  );
}

export default function MissingOrdersManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<DashboardInsightRangeValue>("all");
  const { from: rangeFrom, to: rangeTo } = presetRangeDates(range, new Date());
  const [claimId, setClaimId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"admin" | "rejection">("admin");
  const [rejNote, setRejNote] = useState("");
  const [rejNotes, setRejNotes] = useState<
    { adminId: string; adminName: string; note: string; timestamp: string }[]
  >([]);
  const [noteAuthorId, setNoteAuthorId] = useState("a1");
  const noteAuthorName =
    NOTE_AUTHORS.find((a) => a.value === noteAuthorId)?.label ?? "Admin";
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  const statsQ = useQuery({
    queryKey: ["admin", "mo", "stats"],
    queryFn: getMissingOrderStats,
  });
  const listQ = useQuery({
    queryKey: ["admin", "mo", "list", page, rangeFrom, rangeTo],
    queryFn: () =>
      getMissingOrders({ page, limit: 10, from: rangeFrom, to: rangeTo }),
  });
  const detailQ = useQuery({
    queryKey: ["admin", "mo", "detail", claimId],
    queryFn: () => getMissingOrderDetail(claimId!),
    enabled: Boolean(claimId),
  });

  const assign = useMutation({
    mutationFn: ({ id, assignee }: { id: string; assignee: string }) =>
      putMissingOrderAssign(id, assignee),
    onSuccess: () => {
      toast.success("Assigned");
      void qc.invalidateQueries({ queryKey: ["admin", "mo"] });
    },
  });
  const addNote = useMutation({
    mutationFn: () =>
      postMissingOrderNote(claimId!, note, noteAuthorId, noteAuthorName),
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      void qc.invalidateQueries({
        queryKey: ["admin", "mo", "detail", claimId],
      });
    },
  });
  const approveClaim = useMutation({
    mutationFn: (id: string) => putMissingOrderApprove(id),
    onSuccess: () => {
      toast.success("Claim approved");
      void qc.invalidateQueries({ queryKey: ["admin", "mo"] });
      setClaimId(null);
    },
  });
  const rejectClaim = useMutation({
    mutationFn: (id: string) => putMissingOrderReject(id),
    onSuccess: () => {
      toast.success("Claim rejected");
      void qc.invalidateQueries({ queryKey: ["admin", "mo"] });
      setClaimId(null);
    },
  });

  // Rejection notes are client-side only for now (no backend field yet) — the
  // connected system will own these later, like the claim result/status.
  const addRejectionNote = () => {
    const text = rejNote.trim();
    if (!text) return;
    setRejNotes((prev) => [
      ...prev,
      {
        adminId: noteAuthorId,
        adminName: noteAuthorName,
        note: text,
        timestamp: new Date().toISOString(),
      },
    ]);
    setRejNote("");
  };

  // Close the row Actions dropdown when clicking outside it.
  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(target)
      ) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openActionsId]);

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
      {claimId ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Claim {claimId}
            </h3>
            {detailQ.data ? (
              <StatusTag className={claimStatusColor(detailQ.data.status)}>
                {detailQ.data.status.replace("_", " ")}
              </StatusTag>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setClaimId(null)}
              className="ml-auto"
            >
              Back to claims
            </Button>
            {detailQ.data?.status === "pending" ||
            detailQ.data?.status === "under_review" ? (
              <>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => void approveClaim.mutateAsync(claimId!)}
                >
                  Approve
                </Button>
                <SecondaryButton
                  type="button"
                  onClick={() => void rejectClaim.mutateAsync(claimId!)}
                >
                  Reject
                </SecondaryButton>
              </>
            ) : null}
          </div>

          {detailQ.data ? (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-800 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Registered email
                    </dt>
                    <dd className="mt-0.5 break-all">{detailQ.data.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Registered phone
                    </dt>
                    <dd className="mt-0.5">{detailQ.data.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Store / brand
                    </dt>
                    <dd className="mt-0.5">{detailQ.data.merchantName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Order ID
                    </dt>
                    <dd className="mt-0.5 font-mono">{detailQ.data.orderId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Purchase date
                    </dt>
                    <dd className="mt-0.5">
                      {formatDate(detailQ.data.purchaseDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Sale amount
                    </dt>
                    <dd className="mt-0.5 tabular-nums">
                      {formatMoney(detailQ.data.orderAmount)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Remarks
                    </dt>
                    <dd className="mt-0.5">
                      {detailQ.data.remarks?.trim()
                        ? detailQ.data.remarks
                        : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Proof of purchase
                    </dt>
                    <dd className="mt-1">
                      {detailQ.data.evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {detailQ.data.evidence.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={src}
                              alt=""
                              className="h-24 rounded border border-gray-200 dark:border-gray-700"
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          No proof attached.
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Notes
                    </dt>
                    <dd className="mt-1">
                      {(noteType === "admin" ? detailQ.data.notes : rejNotes)
                        .length > 0 ? (
                        <ul className="space-y-2">
                          {(noteType === "admin"
                            ? detailQ.data.notes
                            : rejNotes
                          ).map((n, i) => (
                            <li
                              key={i}
                              className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                  {(noteType === "admin"
                                    ? "Note from Admin"
                                    : "Rejection Note") +
                                    " : " +
                                    n.adminName}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDateTime(n.timestamp, {
                                    seconds: false,
                                  })}
                                </span>
                              </div>
                              <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                {n.note}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          No notes yet.
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-800 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={noteType === "admin"}
                      onClick={() => setNoteType("admin")}
                      className={noteTabClass(noteType === "admin")}
                    >
                      Note from admin
                    </button>
                    <button
                      type="button"
                      aria-pressed={noteType === "rejection"}
                      onClick={() => setNoteType("rejection")}
                      className={noteTabClass(noteType === "rejection")}
                    >
                      Rejection Note
                    </button>
                  </div>
                  <SecondaryButton
                    onClick={
                      noteType === "admin"
                        ? () => void addNote.mutateAsync()
                        : addRejectionNote
                    }
                    disabled={
                      noteType === "admin" ? !note.trim() : !rejNote.trim()
                    }
                  >
                    Add note
                  </SecondaryButton>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Written by
                  </span>
                  <SortByDropdown
                    value={noteAuthorId}
                    onChange={(e) => setNoteAuthorId(e.target.value)}
                  >
                    {NOTE_AUTHORS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </SortByDropdown>
                </div>

                <div className="mt-3">
                  <TextArea
                    value={noteType === "admin" ? note : rejNote}
                    onChange={noteType === "admin" ? setNote : setRejNote}
                    rows={4}
                    placeholder={
                      noteType === "admin" ? "Internal note" : "Rejection note"
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading…</p>
          )}
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Pending review", value: stats.pendingReview },
                { label: "Approved (week)", value: stats.approvedWeek },
                { label: "Rejected (week)", value: stats.rejectedWeek },
                {
                  label: "Avg resolution (h)",
                  value: stats.avgResolutionHours,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <DashboardInsightRangeControl
              value={range}
              onChange={(v) => {
                setRange(v);
                setPage(1);
              }}
            />
          </div>

          {!rows.length ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No claims.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <table className="w-full min-w-[720px] divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Merchant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {rows.map((c: MissingOrderClaim) => (
                      <tr
                        key={c.id}
                        className="text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap sm:px-6 sm:py-4">
                          {c.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {c.userName}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{c.email}</span>
                            <CopyButton value={c.email} title="Copy email" />
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{c.phone}</span>
                            <CopyButton
                              value={c.phone}
                              title="Copy phone number"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {c.merchantName}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-mono">{c.orderId}</span>
                            <CopyButton
                              value={c.orderId}
                              title="Copy order ID"
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(c.purchaseDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums sm:px-6 sm:py-4">
                          <MoneyCell amount={c.orderAmount} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                          <StatusTag className={claimStatusColor(c.status)}>
                            {c.status.replace("_", " ")}
                          </StatusTag>
                          {c.status === "rejected" ? (
                            c.rejectionReason ? (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Note Added
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Note Needed
                              </p>
                            )
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap sm:px-6 sm:py-4">
                          <div
                            ref={
                              openActionsId === c.id
                                ? actionsDropdownRef
                                : undefined
                            }
                            className="relative inline-block"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionsId((id) =>
                                  id === c.id ? null : c.id,
                                )
                              }
                              className={`${SUPPORT_BUTTON_CLASS} gap-1`}
                              aria-expanded={openActionsId === c.id}
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
                            {openActionsId === c.id && (
                              <div
                                className="absolute top-full right-auto left-0 z-50 mt-1 max-w-[min(18rem,calc(100vw-1.5rem))] min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:right-0 sm:left-auto sm:max-w-none dark:border-gray-600 dark:bg-gray-800"
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setClaimId(c.id);
                                    setNoteType("admin");
                                    setRejNote("");
                                    setRejNotes([]);
                                    setOpenActionsId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    void approveClaim.mutateAsync(c.id);
                                    setOpenActionsId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    void rejectClaim.mutateAsync(c.id);
                                    setOpenActionsId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    void assign.mutateAsync({
                                      id: c.id,
                                      assignee: "a1",
                                    });
                                    setOpenActionsId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Assign me
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
        </>
      )}
    </div>
  );
}
