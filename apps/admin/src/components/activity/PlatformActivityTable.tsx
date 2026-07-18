"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import NoData from "@/components/common/NoData";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { formatDateTime } from "@/lib/dateFormat";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  listAdminActivity,
  type AdminActivityEvent,
} from "@/lib/api/activityApi";

const ACTION_OPTIONS = [
  "",
  "withdraw.created",
  "withdraw.status_changed",
  "withdraw.fee_coupon.redeemed",
  "withdraw.fee_coupon.restored",
  "wallet.adjusted",
  "credit_score.overridden",
  "fee_coupon.created",
  "fee_coupon.updated",
  "admin_user.updated",
  "admin_role.changed",
];

const ENTITY_OPTIONS = [
  "",
  "withdraw",
  "withdraw_fee_coupon",
  "user",
  "admin_user",
  "wallet",
];

export default function PlatformActivityTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 25;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const query = useQuery({
    queryKey: [
      "admin-activity",
      page,
      limit,
      debouncedSearch,
      action,
      entityType,
    ],
    queryFn: ({ signal }) =>
      listAdminActivity(
        {
          page,
          limit,
          search: debouncedSearch || undefined,
          action: action || undefined,
          entity_type: entityType || undefined,
        },
        signal,
      ),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const loadError = useMemo(
    () =>
      query.isError
        ? getApiErrorMessage(
            query.error,
            "Couldn't load platform activity. Refresh or contact an admin.",
          )
        : null,
    [query.error, query.isError],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Append-only log of money and admin operations across the platform.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600 dark:text-gray-400">
            Search
          </span>
          <input
            aria-label="Search activity"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            placeholder="Summary, actor, action…"
            role="searchbox"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600 dark:text-gray-400">
            Action
          </span>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "All actions"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600 dark:text-gray-400">
            Entity
          </span>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={entityType}
            onChange={(e) => {
              setPage(1);
              setEntityType(e.target.value);
            }}
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt || "all-entity"} value={opt}>
                {opt || "All entities"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadError ? <p className="text-error-500 text-sm">{loadError}</p> : null}

      {query.isLoading ? (
        <p className="text-sm text-gray-500">Loading activity…</p>
      ) : null}

      {!query.isLoading && !loadError && rows.length === 0 ? <NoData /> : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-white/[0.03] dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ActivityRow
                  key={row._id}
                  row={row}
                  expanded={expandedId === row._id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === row._id ? null : row._id,
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {total > 0 ? (
        <AdminPaginationBar
          page={page}
          totalPages={Math.max(1, Math.ceil(total / limit))}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

function ActivityRow({
  row,
  expanded,
  onToggle,
}: {
  row: AdminActivityEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const metadataId = `activity-metadata-${row._id}`;
  return (
    <>
      <tr className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
          {formatDateTime(row.occurred_at)}
        </td>
        <td className="px-4 py-3">
          <div className="text-gray-800 dark:text-white/90">
            {row.actor_label || row.actor_id || "—"}
          </div>
          <div className="text-xs text-gray-500">{row.actor_type}</div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
          {row.action}
        </td>
        <td className="px-4 py-3">
          <div className="text-gray-800 dark:text-white/90">
            {row.entity_type}
          </div>
          <div className="font-mono text-xs text-gray-500">
            {row.entity_id || "—"}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-800 dark:text-white/90">
          <button
            aria-controls={metadataId}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} metadata for ${row.summary}`}
            className="focus-visible:outline-brand-500 flex w-full items-center justify-between gap-3 text-left focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={onToggle}
            type="button"
          >
            <span>{row.summary}</span>
            <span aria-hidden="true" className="text-xs text-gray-500">
              {expanded ? "Hide" : "Details"}
            </span>
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr
          className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
          id={metadataId}
        >
          <td colSpan={5} className="px-4 py-3">
            <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {JSON.stringify(row.metadata ?? {}, null, 2)}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  );
}
