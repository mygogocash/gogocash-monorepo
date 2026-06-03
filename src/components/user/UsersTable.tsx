"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { Offer, RegularUser, UsersQuery } from "@/types/api";
import FormUpdate from "./FormUpdate";
import { UserForm } from "@/types/user";
import ViewMyCashback from "./ViewMyCashback";
import { useRouter, useSearchParams } from "next/navigation";
import { devError } from "@/lib/devConsole";

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

  const [query, setQuery] = useState<UsersQuery>({
    limit: 12,
    page: 1,
    search: "",
  });

  // Apply ?search= from URL on mount (e.g. from Conversion "View user info")
  useEffect(() => {
    const initialSearch = searchParams.get("search") ?? "";
    if (initialSearch) {
      const q = { ...query, search: initialSearch, page: 1 };
      setQuery(q);
      fetchUsersWithQuery(q);
    } else {
      fetchUsersWithQuery(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Close actions dropdown when clicking outside
  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(target)) {
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

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
    fetchUsers(newQuery);
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

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
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total} users
          </p>
        </div>
        <input
          type="text"
          placeholder="Search users..."
          value={query.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
        />
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
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user._id && `ID: ${user._id}`}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.address
                                  ? `Address: ${user.address}`
                                  : `Address: -`}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Mobile: {user.mobile ? user.mobile : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                birthdate:{" "}
                                {user.birthdate
                                  ? user.birthdate.toString()
                                  : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                gender: {user.gender ? user.gender : "-"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Date Login:{" "}
                                {user.updatedAt
                                  ? new Date(
                                      user.updatedAt,
                                    ).toLocaleDateString() +
                                    " " +
                                    new Date(
                                      user.updatedAt,
                                    ).toLocaleTimeString()
                                  : "-"}
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
                        <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <div
                            ref={openActionsId === user._id ? actionsDropdownRef : undefined}
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
                              className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-expanded={openActionsId === user._id}
                              aria-haspopup="true"
                            >
                              Actions
                              <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openActionsId === user._id && (
                              <div
                                className="absolute left-0 right-auto top-full z-50 mt-1 min-w-[10rem] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 sm:left-auto sm:right-0 sm:max-w-none"
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToUserInfo(user, { editUser: true });
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
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() =>
                      handlePageChange(Number(pagination.page) - 1)
                    }
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => {
                      handlePageChange(
                        Number(pagination.page) + 1 > pagination.totalPages
                          ? pagination.totalPages
                          : Number(pagination.page) + 1,
                      );
                    }}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {users && users.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No users found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
