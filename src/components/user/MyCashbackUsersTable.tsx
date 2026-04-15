"use client";

import { listMyCashbackUsers } from "@/lib/api/myCashbackUsersApi";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { devError } from "@/lib/devConsole";
import type { MyCashbackResponse } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 12;

type ListQuery = { page: number; search: string };

export default function MyCashbackUsersTable() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [{ page, search: searchQuery }, setListQuery] = useState<ListQuery>({
    page: 1,
    search: "",
  });

  useEffect(() => {
    const trimmed = searchInput.trim();
    const delay = trimmed === "" ? 0 : 300;
    const id = setTimeout(() => {
      setListQuery((prev) => ({
        search: trimmed,
        page: prev.search === trimmed ? prev.page : 1,
      }));
    }, delay);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["myCashbackUsers", page, searchQuery],
    queryFn: () =>
      listMyCashbackUsers({
        page,
        limit: PAGE_SIZE,
        search: searchQuery,
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

  const hasNextPage = page < pagination.totalPages;
  const hasPrevPage = page > 1;

  const primaryBalance = (u: MyCashbackResponse) => {
    const b = u.balance?.[0];
    return b ? `${b.amount} ${b.currency}` : "—";
  };

  const navigateToWithdrawDetail = useCallback(
    (u: MyCashbackResponse) => {
      const displayName =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "User";
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
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            MyCashBack Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            App users on the MyCashBack program. Total:{" "}
            {pagination.total.toLocaleString()}
          </p>
        </div>
        <input
          type="search"
          placeholder="Search by name, email, phone, buyer ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[320px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
        />
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
                      Buyer ID
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
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No MyCashBack users match your search.
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
                                {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                ID: {u._id}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Address: {u.address ? u.address : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Mobile: {u.phoneNumber ? u.phoneNumber : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                birthdate:{" "}
                                {u.dateOfBirth
                                  ? String(u.dateOfBirth)
                                  : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                gender: {u.gender ? u.gender : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Date Login:{" "}
                                {u.updatedAt
                                  ? `${new Date(u.updatedAt).toLocaleDateString()} ${new Date(u.updatedAt).toLocaleTimeString()}`
                                  : "-"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                          {u.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-800 dark:text-gray-200">
                          {u.phoneNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {u.buyerId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                          {primaryBalance(u)}
                        </td>
                        <td className="px-6 py-4">
                          {u.banned ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                              Banned
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToWithdrawDetail(u);
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total.toLocaleString()}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
