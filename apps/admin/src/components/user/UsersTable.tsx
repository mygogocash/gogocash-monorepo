"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { Offer, RegularUser, UsersQuery } from "@/types/api";
import FormUpdate from "./FormUpdate";
import { UserForm } from "@/types/user";
import ViewMyCashback from "./ViewMyCashback";
import { useRouter, useSearchParams } from "next/navigation";
import { devError } from "@/lib/devConsole";
import CopyButton from "@/components/ui/CopyButton";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import NoData from "@/components/common/NoData";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import SearchBar from "@/components/ui/button/SearchBar";
import { planCycle, CYCLE_LABEL, CYCLE_BADGE } from "@/lib/subscriptionCycle";
import { tierFromScore, CREDIT_TIER_BADGE } from "@/lib/creditTier";

/** Users-table filter dimension; each maps to a second-dropdown value set. */
type FilterDim = "tier" | "membership" | "subscription";

/** Second-dropdown options per dimension ([value, label]); "" = no filter. */
const FILTER_VALUES: Record<FilterDim, [string, string][]> = {
  tier: [
    ["", "All tiers"],
    ["bronze", "Bronze"],
    ["silver", "Silver"],
    ["gold", "Gold"],
    ["platinum", "Platinum"],
  ],
  membership: [
    ["", "All memberships"],
    ["Basic", "Basic"],
    ["GoGoPass Plus", "GoGoPass Plus"],
  ],
  subscription: [
    ["", "All subscriptions"],
    ["monthly", "Monthly"],
    ["annual", "Annually"],
    ["none", "Not subscribed"],
  ],
};

export default function UsersTable() {
  const searchParams = useSearchParams();
  const { loading, error, getUsers, clearError } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<UserForm>({
    id: "",
    mobile: "",
    username: "",
    email: "",
    address: "",
    birthdate: "",
    country: "",
    gender: "",
  });
  const [openModal, setOpenModal] = useState<Offer | boolean>(false);
  const [openModalView, setOpenModalView] = useState<boolean>(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [users, setUsers] = useState<RegularUser[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState<UsersQuery>(() => ({
    limit: 12,
    page: 1,
    search: searchParams.get("search") ?? "",
    sort: "newest",
  }));
  const [filterDim, setFilterDim] = useState<FilterDim>("tier");

  // Guards: ignore out-of-order responses; debounce free-text search.
  const reqIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch users
  const fetchUsersWithQuery = async (queryToUse: UsersQuery) => {
    const reqId = ++reqIdRef.current;
    try {
      const response = await getUsers(queryToUse);
      if (reqId !== reqIdRef.current) return; // a newer request superseded this
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err) {
      if (reqId === reqIdRef.current) devError("Failed to fetch users:", err);
    }
  };

  const fetchUsers = async (newQuery?: UsersQuery) => {
    const queryToUse = newQuery ?? query;
    await fetchUsersWithQuery(queryToUse);
  };

  // Apply ?search= from URL on mount (initial query state includes it).
  useEffect(() => {
    queueMicrotask(() => {
      void fetchUsersWithQuery(query);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close actions dropdown when clicking outside
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

  // Handle search (debounced; latest response wins via reqIdRef)
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchUsers(newQuery), 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Handle filter change (dimension + value); reset to first page on change.
  const applyFilter = (dim: FilterDim, value: string) => {
    const newQuery: UsersQuery = {
      ...query,
      tier: undefined,
      membership: undefined,
      subscription: undefined,
      page: 1,
    };
    if (value) newQuery[dim] = value;
    setQuery(newQuery);
    fetchUsers(newQuery);
  };
  const handleDimChange = (dim: FilterDim) => {
    setFilterDim(dim);
    applyFilter(dim, ""); // reset to "All" when the dimension changes
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
    fetchUsers(newQuery);
  };

  const navigateToUserInfo = (
    user: RegularUser,
    opts?: { editUser?: boolean },
  ) => {
    const params = new URLSearchParams({
      from: "users",
      name: user.username || user.email || "User",
    });
    if (opts?.editUser) params.set("editUser", "1");
    router.push(`/withdraw/${user._id}?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <FormUpdate
        fetchData={fetchUsers}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
      <ViewMyCashback
        id={form.id}
        openModal={Boolean(openModalView)}
        setOpenModal={setOpenModalView}
      />
      <div className="flex items-center justify-between gap-20 px-6 py-5">
        <div className="shrink-0">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            GoGoCash Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total} users
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            Sort by
            <SortByDropdown
              value={filterDim}
              onChange={(e) => handleDimChange(e.target.value as FilterDim)}
              aria-label="Filter dimension"
            >
              <option value="tier">Credit Tier</option>
              <option value="membership">Membership</option>
              <option value="subscription">Subscription</option>
            </SortByDropdown>
          </label>
          <SortByDropdown
            value={query[filterDim] ?? ""}
            onChange={(e) => applyFilter(filterDim, e.target.value)}
            aria-label="Filter value"
          >
            {FILTER_VALUES[filterDim].map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </SortByDropdown>
          <SearchBar
            placeholder="Search users..."
            value={query.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading users...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Users Table */}
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
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Membership
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {users &&
                    users?.map((user) => (
                      <tr
                        key={user._id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => navigateToUserInfo(user)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                                <span className="text-sm font-medium text-gray-700">
                                  {user?.username &&
                                    user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.username}
                              </div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <span>
                                  {user._id ? `ID: ${user._id}` : "ID: -"}
                                </span>
                                <CopyButton
                                  value={user._id}
                                  title="Copy user ID"
                                />
                              </div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <span>
                                  {user.address
                                    ? `Wallet: ${user.address}`
                                    : "Wallet: -"}
                                </span>
                                <CopyButton
                                  value={user.address}
                                  title="Copy wallet address"
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                            {"User"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.creditScore != null ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${CREDIT_TIER_BADGE[tierFromScore(user.creditScore)]}`}
                            >
                              {tierFromScore(user.creditScore)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              user.membershipTier === "GoGoPass Plus"
                                ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {user.membershipTier ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.subscriptionPlan ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${CYCLE_BADGE[planCycle(user.subscriptionPlan)]}`}
                            >
                              {CYCLE_LABEL[planCycle(user.subscriptionPlan)]}
                            </span>
                          ) : null}
                        </td>
                        <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <div
                            ref={
                              openActionsId === user._id
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
                                setOpenActionsId((id) =>
                                  id === user._id ? null : user._id,
                                );
                              }}
                              aria-expanded={openActionsId === user._id}
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
                            {openActionsId === user._id && (
                              <div
                                className="absolute top-full right-auto left-0 z-50 mt-1 max-w-[min(18rem,calc(100vw-1.5rem))] min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:right-0 sm:left-auto sm:max-w-none dark:border-gray-600 dark:bg-gray-800"
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToUserInfo(user, {
                                      editUser: true,
                                    });
                                    setOpenActionsId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToUserInfo(user);
                                    setOpenActionsId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  View Info
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <AdminPaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}

            {users && users.length === 0 && !loading && (
              <NoData>No users found</NoData>
            )}
          </>
        )}
      </div>
    </div>
  );
}
