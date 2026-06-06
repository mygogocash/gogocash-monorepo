"use client";

import { listMyCashbackUsers } from "@/lib/api/myCashbackUsersApi";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { devError } from "@/lib/devConsole";
import type { MyCashbackResponse } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CopyButton from "@/components/ui/CopyButton";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import SearchBar from "@/components/ui/button/SearchBar";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import NoData from "@/components/common/NoData";
import StatusTag from "@/components/ui/StatusTag";

const PAGE_SIZE = 12;

type ListQuery = {
  page: number;
  search: string;
  sort: string;
  status: string;
};

export default function MyCashbackUsersTable() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [{ page, search: searchQuery, sort, status }, setListQuery] =
    useState<ListQuery>({
      page: 1,
      search: "",
      sort: "newest",
      status: "",
    });

  useEffect(() => {
    const trimmed = searchInput.trim();
    const delay = trimmed === "" ? 0 : 300;
    const id = setTimeout(() => {
      setListQuery((prev) => ({
        ...prev,
        search: trimmed,
        page: prev.search === trimmed ? prev.page : 1,
      }));
    }, delay);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["myCashbackUsers", page, searchQuery, sort, status],
    queryFn: () =>
      listMyCashbackUsers({
        page,
        limit: PAGE_SIZE,
        search: searchQuery,
        sort,
        status,
      }),
  });

  const rows: MyCashbackResponse[] = data?.data ?? [];
  const pagination = {
    limit: data?.pagination?.limit ?? PAGE_SIZE,
    total: data?.pagination?.total ?? 0,
    totalPages: data?.pagination?.totalPages ?? 1,
  };

  if (isError) {
    devError("MyCashback list failed:", error);
  }

  const listError = isError
    ? getApiErrorMessage(error, "Failed to load MyCashBack users")
    : null;

  const handlePageChange = (newPage: number) => {
    setListQuery((prev) => ({ ...prev, page: newPage }));
  };
  const handleSort = (value: string) => {
    setListQuery((prev) => ({ ...prev, sort: value, page: 1 }));
  };
  const handleStatus = (value: string) => {
    setListQuery((prev) => ({ ...prev, status: value, page: 1 }));
  };

  const primaryBalance = (u: MyCashbackResponse) => {
    const b = u.balance?.[0];
    return b ? `${b.amount} ${b.currency}` : "—";
  };

  const navigateToWithdrawDetail = useCallback(
    (u: MyCashbackResponse) => {
      const displayName =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.email ||
        "User";
      const params = new URLSearchParams({
        from: "mycashback",
        name: displayName,
      });
      router.push(`/withdraw/${u._id}?${params.toString()}`);
    },
    [router],
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-20 px-6 py-5">
        <div className="shrink-0">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            MyCashBack Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total.toLocaleString()} users
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            Sort by
            <SortByDropdown
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              aria-label="Sort users"
            >
              <option value="newest">Newest</option>
              <option value="name">Name (A–Z)</option>
              <option value="balance">Balance</option>
            </SortByDropdown>
          </label>
          <SortByDropdown
            value={status}
            onChange={(e) => handleStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </SortByDropdown>
          <SearchBar
            type="search"
            placeholder="Search by name, email, phone, buyer ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {listError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {listError}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading…
            </span>
          </div>
        )}

        {!isLoading && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6">
                        <NoData>No MyCashBack users match your search.</NoData>
                      </td>
                    </tr>
                  ) : (
                    rows.map((u) => (
                      <tr
                        key={u._id}
                        title="Open user detail (withdraw)"
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => navigateToWithdrawDetail(u)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                  {u.firstName?.charAt(0)?.toUpperCase() ?? "?"}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {[u.firstName, u.lastName]
                                  .filter(Boolean)
                                  .join(" ") || u.email}
                              </div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <span>ID: {u._id}</span>
                                <CopyButton
                                  value={u._id}
                                  title="Copy user ID"
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
                          {u.phoneNumber}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
                          {primaryBalance(u)}
                        </td>
                        <td className="px-6 py-4">
                          {u.banned ? (
                            <StatusTag className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                              Banned
                            </StatusTag>
                          ) : (
                            <StatusTag className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Active
                            </StatusTag>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToWithdrawDetail(u);
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium whitespace-nowrap text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            View info
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <AdminPaginationBar
                page={page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
