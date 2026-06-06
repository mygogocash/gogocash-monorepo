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
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import { formatMoney } from "@/lib/currencyFormat";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import SearchBar from "@/components/ui/button/SearchBar";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import StatusTag from "@/components/ui/StatusTag";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";

/** Per-status color classes for the referrals StatusTag. */
const REFERRAL_STATUS_COLOR: Record<Referral["status"], string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  qualified: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

function ReferralConfigForm({
  initial,
  onSave,
}: {
  initial: ReferralConfig;
  onSave: (c: ReferralConfig) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);

  const cancel = () => {
    setDraft(initial);
    setEditing(false);
  };
  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Referral program
        </h2>
        {!editing ? (
          <SecondaryButton onClick={() => setEditing(true)}>
            Edit
          </SecondaryButton>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={cancel}>Cancel</SecondaryButton>
            <SecondaryButton variant="blue" onClick={save}>
              Save
            </SecondaryButton>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Referrer reward{" "}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              (Senders)
            </span>
          </p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                value={String(draft.referrerRewardValue)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    referrerRewardValue: Number(e.target.value),
                  })
                }
              />
              <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                THB
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatMoney(initial.referrerRewardValue)}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Referee bonus{" "}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              (Receivers)
            </span>
          </p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                value={String(draft.refereeBonus)}
                onChange={(e) =>
                  setDraft({ ...draft, refereeBonus: Number(e.target.value) })
                }
              />
              <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                THB
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatMoney(initial.refereeBonus)}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Min transaction
          </p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                value={String(draft.minTransactionAmount)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minTransactionAmount: Number(e.target.value),
                  })
                }
              />
              <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                THB
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatMoney(initial.minTransactionAmount)}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Reward expiry: {initial.rewardExpiryDays} days.
      </p>
    </section>
  );
}

export default function ReferralManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [treeUser, setTreeUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Referrals table filter: dimension (only "status" for now) + status value.
  const [refFilter, setRefFilter] = useState("status");
  const [refStatus, setRefStatus] = useState("");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const cfgQ = useQuery({ queryKey: ["admin", "ref", "cfg"], queryFn: getReferralConfig });
  const listQ = useQuery({
    queryKey: ["admin", "ref", "list", page, debouncedSearch, refStatus],
    queryFn: () =>
      getReferrals({
        page,
        limit: 10,
        search: debouncedSearch,
        status: refStatus,
      }),
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

  // Close the row Actions menu when clicking outside the open dropdown.
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

  const exportCsv = () => {
    const header =
      "referrer,referee,status,referrerRewardPaid,refereeRewardPaid\n";
    const lines = rows
      .map(
        (r) =>
          `${r.referrerName},${r.refereeName},${r.status},${r.referrerRewardPaid},${r.refereeRewardPaid}`,
      )
      .join("\n");
    const blob = new Blob([header + lines], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "referrals.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export started");
  };

  const runRowAction = (action: string, r: Referral) => {
    if (action === "tree") setTreeUser(r.referrerId);
    else if (action === "approve") void approve.mutateAsync(r.id);
    else if (action === "reject") void reject.mutateAsync(r.id);
  };

  return (
    <div className="space-y-8">
      {cfgQ.data && (
        <ReferralConfigForm key={cfgQ.dataUpdatedAt} initial={cfgQ.data} onSave={saveReferralConfig} />
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Referrals
          </h2>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={exportCsv}>Export CSV</PrimaryButton>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            Sort by
            <SortByDropdown
              value={refFilter}
              onChange={(e) => {
                setRefFilter(e.target.value);
                setRefStatus("");
                setPage(1);
              }}
            >
              <option value="status">Status</option>
            </SortByDropdown>
          </label>
          {refFilter === "status" && (
            <SortByDropdown
              value={refStatus}
              onChange={(e) => {
                setRefStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="qualified">Qualified</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </SortByDropdown>
          )}
          <SearchBar
            placeholder="Search referrer or referee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Referrer
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Referee
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Paid
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r: Referral) => (
                <tr key={r.id} className="text-gray-800 dark:text-gray-200">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.referrerName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {r.referrerEmail}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.refereeName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {r.refereeEmail}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusTag className={REFERRAL_STATUS_COLOR[r.status]}>
                      {r.status}
                    </StatusTag>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>Sender : {r.referrerRewardPaid}</div>
                    <div>Receiver : {r.refereeRewardPaid}</div>
                  </td>
                  <td className="relative px-3 py-3">
                    <div
                      ref={
                        openActionsId === r.id ? actionsDropdownRef : undefined
                      }
                      className="relative inline-block"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenActionsId((id) => (id === r.id ? null : r.id))
                        }
                        aria-expanded={openActionsId === r.id}
                        aria-haspopup="true"
                        className={`${SUPPORT_BUTTON_CLASS} gap-1`}
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
                      {openActionsId === r.id && (
                        <div
                          className="absolute top-full right-0 left-auto z-50 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                          role="menu"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              runRowAction("tree", r);
                              setOpenActionsId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            View Tree
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={r.status === "paid"}
                            onClick={() => {
                              runRowAction("approve", r);
                              setOpenActionsId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-gray-700 dark:disabled:hover:bg-transparent"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={r.status === "paid"}
                            onClick={() => {
                              runRowAction("reject", r);
                              setOpenActionsId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-gray-700 dark:disabled:hover:bg-transparent"
                          >
                            Reject
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
