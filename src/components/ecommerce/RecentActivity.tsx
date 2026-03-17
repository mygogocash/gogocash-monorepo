"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useApi } from "@/hooks/useApi";
import type { DataConversion, DataWithdrawsList } from "@/types/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const LIMIT = 5;

type ActivityItem =
  | { type: "conversion"; data: DataConversion }
  | { type: "withdrawal"; data: DataWithdrawsList };

function formatDate(d: Date | string | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: string): "success" | "warning" | "error" {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "success";
  if (s === "pending") return "warning";
  return "error";
}

export default function RecentActivity() {
  const api = useApi();
  const apiRef = React.useRef(api);
  apiRef.current = api;
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | undefined)?.accessToken ?? "";
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const { getConversion, getWithdraws } = apiRef.current;
    Promise.all([
      getConversion({ limit: LIMIT, page: 1 }, token).then((r) =>
        (r?.data ?? []).map((c) => ({ type: "conversion" as const, data: c }))
      ),
      getWithdraws({ limit: LIMIT, page: 1 }, token).then((r) =>
        (r?.data ?? []).map((w) => ({ type: "withdrawal" as const, data: w }))
      ),
    ])
      .then(([convs, withdraws]) => {
        if (cancelled) return;
        const merged: ActivityItem[] = [];
        const withDate = (a: ActivityItem) => {
          const d = a.type === "conversion" ? a.data.createdAt : a.data.createdAt;
          return { a, date: new Date(d ?? 0).getTime() };
        };
        [...convs.map((a) => withDate(a)), ...withdraws.map((a) => withDate(a))]
          .sort((x, y) => y.date - x.date)
          .slice(0, LIMIT)
          .forEach(({ a }) => merged.push(a));
        setActivities(merged);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent activity
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/conversion"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.29004 5.90393H17.7067"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17.7075 14.0961H2.29085"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
              <path
                d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                fill=""
                stroke=""
                strokeWidth="1.5"
              />
            </svg>
            Filter
          </Link>
          <Link
            href="/conversion"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            See all
          </Link>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Type
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Activity
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Detail
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading…
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No recent activity
                </TableCell>
              </TableRow>
            ) : (
              activities.map((item, idx) =>
                item.type === "conversion" ? (
                  <TableRow key={`c-${item.data.conversion_id}-${idx}`}>
                    <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300">
                      Conversion
                    </TableCell>
                    <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {item.data.offer_name || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-600 dark:text-gray-400">
                      {item.data.payout} {item.data.currency} · {item.data.user?.username ?? item.data.user?.email ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatDate(item.data.createdAt ?? item.data.datetime_conversion)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={statusColor(item.data.conversion_status)}>
                        {item.data.conversion_status || "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={`w-${item.data._id}-${idx}`}>
                    <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-300">
                      Withdrawal
                    </TableCell>
                    <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {item.data.user_id?.username ?? item.data.account_name ?? item.data._id}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-600 dark:text-gray-400">
                      {item.data.amount_net} {item.data.currency}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatDate(item.data.createdAt)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={statusColor(item.data.status)}>
                        {item.data.status || "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
