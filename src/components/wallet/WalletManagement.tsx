"use client";

import { useQuery } from "@tanstack/react-query";
import { getWallets } from "@/lib/api/adminModulesApi";
import type { UserWallet } from "@/types/adminModules";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import StatusTag from "@/components/ui/StatusTag";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import SearchBar from "@/components/ui/button/SearchBar";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WalletManagement() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Wallets table filter: dimension (only "status" for now) + status value.
  const [walletFilter, setWalletFilter] = useState("status");
  const [walletStatus, setWalletStatus] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const listQ = useQuery({
    queryKey: ["admin", "wallet", "list", page, debouncedSearch, walletStatus],
    queryFn: () =>
      getWallets({
        page,
        limit: 10,
        search: debouncedSearch,
        status: walletStatus,
      }),
  });

  const rows = listQ.data?.data ?? [];

  // Wallet management (freeze / adjust) lives on each user's detail page now —
  // "Manage" navigates there rather than opening a modal here.
  const openWalletDetail = (w: UserWallet) =>
    router.push(
      `/withdraw/${w.userId}?from=wallet&name=${encodeURIComponent(w.userName)}`,
    );

  const exportCsv = () => {
    const header = "userId,userName,email,ggc,cashback,points,status\n";
    const lines = rows
      .map(
        (w) =>
          `${w.userId},${w.userName.replace(/,/g, " ")},${w.email},${w.ggcBalance},${w.cashbackBalance},${w.pointsBalance},${w.status}`,
      )
      .join("\n");
    const blob = new Blob([header + lines], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wallets.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export started");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Wallets
          </h2>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={exportCsv}>Export CSV</PrimaryButton>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            Sort by
            <SortByDropdown
              value={walletFilter}
              onChange={(e) => {
                setWalletFilter(e.target.value);
                setWalletStatus("");
                setPage(1);
              }}
            >
              <option value="status">Status</option>
            </SortByDropdown>
          </label>
          {walletFilter === "status" && (
            <SortByDropdown
              value={walletStatus}
              onChange={(e) => {
                setWalletStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
            </SortByDropdown>
          )}
          <SearchBar
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {listQ.isLoading ? (
          <AdminTableSkeleton rows={5} />
        ) : listQ.isError ? (
          <AdminQueryError
            title="Could not load wallets"
            onRetry={() => void listQ.refetch()}
          />
        ) : !rows.length ? (
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No wallets for this filter.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    User
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    GGC
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    Cashback
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    Points
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
                {rows.map((w: UserWallet) => (
                  <tr
                    key={w.userId}
                    className="text-gray-800 dark:text-gray-200"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium">{w.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {w.email}
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{w.ggcBalance}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {w.cashbackBalance}
                    </td>
                    <td className="px-3 py-3 font-semibold tabular-nums">
                      {w.pointsBalance}
                    </td>
                    <td className="px-3 py-3">
                      <StatusTag
                        className={
                          w.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                        }
                      >
                        {w.status}
                      </StatusTag>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openWalletDetail(w)}
                        className={SUPPORT_BUTTON_CLASS}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  );
}
