"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApi, useAuth } from "@/hooks/useApi";
import { formatDate } from "@/lib/dateFormat";
import { AdminUsersQuery, DataAdminUsers } from "@/types/api";
import { Modal } from "@/components/ui/modal";
import NoData from "@/components/common/NoData";
import { devError } from "@/lib/devConsole";
import { usePermissions } from "@/hooks/usePermissions";
import { useRolesQuery } from "@/hooks/useRoles";
import { roleBadgeClass } from "@/lib/rbac";
import { isDirty } from "@/lib/isDirty";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

export default function AdminUsersTable() {
  const {
    loading,
    error,
    getAdminUsers,
    deleteAdminUser,
    updateAdminUser,
    inviteAdminUser,
    clearError,
  } = useApi();
  const { requestPasswordReset } = useAuth();
  const { can } = usePermissions();
  const canManage = can("adminUsers:manage");

  const { data: rolesData } = useRolesQuery();
  const roleDefs = rolesData?.data ?? [];
  const roleLabel = (id?: string) =>
    roleDefs.find((r) => r.id === id)?.label ?? id ?? "—";

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("editor");

  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    _id: string;
    username: string;
    email: string;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<{
    username: string;
    email: string;
  } | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<{
    _id: string;
    username: string;
    role: string;
  } | null>(null);
  const [newRole, setNewRole] = useState<string>("editor");
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const [users, setUsers] = useState<DataAdminUsers[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 12,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [query, setQuery] = useState<AdminUsersQuery>({
    limit: 12,
    page: 1,
    search: "",
  });

  // Guards: ignore out-of-order responses; debounce free-text search.
  const reqIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch admin users
  const fetchUsers = async (newQuery?: AdminUsersQuery) => {
    const reqId = ++reqIdRef.current;
    try {
      const queryToUse = newQuery || query;
      const response = await getAdminUsers(queryToUse);
      if (reqId !== reqIdRef.current) return; // a newer request superseded this
      setUsers(response.data);
      setPagination({
        currentPage: response.pagination.page,
        totalPages: response.pagination.totalPages,
        totalUsers: response.pagination.total,
        limit: response.pagination.limit,
        hasNextPage: response.pagination.page < response.pagination.totalPages,
        hasPrevPage: response.pagination.page > 1,
      });
    } catch (err) {
      if (reqId === reqIdRef.current)
        devError("Failed to fetch admin users:", err);
    }
  };

  // Initial load — defer fetch so eslint doesn't flag sync setState in the effect.
  useEffect(() => {
    queueMicrotask(() => {
      void fetchUsers();
    });
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

  // Open delete confirm dialog
  const openDeleteConfirm = (user: DataAdminUsers) => {
    setUserToDelete({
      _id: user._id,
      username: user.username ?? "",
      email: user.email ?? "",
    });
    setDeleteConfirmOpen(true);
    clearError();
  };

  // Handle user deletion (after confirm)
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteSubmitting(true);
    clearError();
    try {
      await deleteAdminUser(userToDelete._id);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      devError("Failed to delete user:", err);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Open reset password confirm
  const openResetPassword = (user: DataAdminUsers) => {
    setUserToReset({ username: user.username ?? "", email: user.email ?? "" });
    setResetPasswordOpen(true);
    setResetSuccess(null);
    clearError();
  };

  // Send password reset email
  const handleConfirmResetPassword = async () => {
    if (!userToReset?.email) return;
    setResetSubmitting(true);
    setResetSuccess(null);
    try {
      await requestPasswordReset(userToReset.email);
      setResetSuccess(`Password reset email sent to ${userToReset.email}`);
      setTimeout(() => {
        setResetPasswordOpen(false);
        setUserToReset(null);
        setResetSuccess(null);
      }, 2000);
    } catch (err) {
      devError("Failed to send reset email:", err);
    } finally {
      setResetSubmitting(false);
    }
  };

  // Open change-role dialog
  const openChangeRole = (user: DataAdminUsers) => {
    const current = user.role ?? "viewer";
    setUserToChangeRole({
      _id: user._id,
      username: user.username ?? "",
      role: current,
    });
    setNewRole(current);
    setRoleModalOpen(true);
    clearError();
  };

  // Persist a role change
  const handleConfirmChangeRole = async () => {
    if (!userToChangeRole) return;
    setRoleSubmitting(true);
    clearError();
    try {
      await updateAdminUser(userToChangeRole._id, { role: newRole });
      setRoleModalOpen(false);
      setUserToChangeRole(null);
      await fetchUsers();
    } catch (err) {
      devError("Failed to change role:", err);
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Handle send invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteSubmitting(true);
    setInviteSuccess(null);
    setInviteError(null);
    try {
      await inviteAdminUser(email, inviteRole);
      setInviteSuccess(`Invitation accepted for delivery to ${email}`);
      setInviteEmail("");
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess(null);
        fetchUsers();
      }, 1500);
    } catch (err) {
      setInviteError(
        getApiErrorMessage(
          err,
          "We couldn't send the invitation. Please try again, or contact an administrator if it continues.",
        ),
      );
      // This operation owns an inline modal error. Avoid also rendering the
      // shared page-level error behind the modal overlay.
      clearError();
      devError("Failed to send invitation:", err);
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Date formatting now comes from @/lib/dateFormat (dd/mm/yyyy).

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Admin Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.totalUsers} users
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setInviteModalOpen(true);
                setInviteEmail("");
                setInviteSuccess(null);
                setInviteError(null);
                clearError();
              }}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Send invitation
            </button>
          )}
          <input
            type="text"
            placeholder="Search users..."
            onChange={(e) => handleSearch(e.target.value)}
            className="focus:ring-brand-500/20 dark:focus:ring-brand-400/30 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Invite admin modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => !inviteSubmitting && setInviteModalOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invite admin
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter the email address to send an admin invitation.
        </p>
        <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={inviteSubmitting}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={inviteSubmitting || roleDefs.length === 0}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {roleDefs.length === 0 ? (
                <option value="">Loading roles…</option>
              ) : (
                roleDefs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))
              )}
            </select>
          </div>
          {inviteSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {inviteSuccess}
            </p>
          )}
          {inviteError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              {inviteError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !inviteSubmitting && setInviteModalOpen(false)}
              disabled={inviteSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteSubmitting || !inviteEmail.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {inviteSubmitting
                ? "Sending…"
                : inviteError
                  ? "Retry sending"
                  : "Send invitation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset password confirmation modal */}
      <Modal
        isOpen={resetPasswordOpen}
        onClose={() => {
          if (!resetSubmitting) {
            setResetPasswordOpen(false);
            setUserToReset(null);
            setResetSuccess(null);
          }
        }}
        className="max-w-md p-6"
      >
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Reset password
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Send a password reset email to this admin user. They will receive a
            link to set a new password.
          </p>
          {userToReset && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white">
                {userToReset.username}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {userToReset.email}
              </p>
            </div>
          )}
          {resetSuccess && (
            <p className="mt-3 text-sm text-green-600 dark:text-green-400">
              {resetSuccess}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!resetSubmitting) {
                  setResetPasswordOpen(false);
                  setUserToReset(null);
                  setResetSuccess(null);
                }
              }}
              disabled={resetSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResetPassword}
              disabled={resetSubmitting || !userToReset?.email}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {resetSubmitting ? "Sending…" : "Send reset email"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleteSubmitting) {
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
          }
        }}
        className="max-w-md p-6"
      >
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Remove admin user
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to remove this admin? This action cannot be
            undone.
          </p>
          {userToDelete && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white">
                {userToDelete.username}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {userToDelete.email}
              </p>
            </div>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!deleteSubmitting) {
                  setDeleteConfirmOpen(false);
                  setUserToDelete(null);
                }
              }}
              disabled={deleteSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteSubmitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {deleteSubmitting ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Change role modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => {
          if (!roleSubmitting) {
            setRoleModalOpen(false);
            setUserToChangeRole(null);
          }
        }}
        className="max-w-md p-6"
      >
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Change role
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Set the access role for this admin user.
          </p>
          {userToChangeRole && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <p className="font-medium text-gray-900 dark:text-white">
                {userToChangeRole.username}
              </p>
            </div>
          )}
          <div className="mt-4">
            <label
              htmlFor="change-role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Role
            </label>
            <select
              id="change-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              disabled={roleSubmitting || roleDefs.length === 0}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {roleDefs.length === 0 ? (
                <option value="">Loading roles…</option>
              ) : (
                roleDefs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!roleSubmitting) {
                  setRoleModalOpen(false);
                  setUserToChangeRole(null);
                }
              }}
              disabled={roleSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmChangeRole}
              disabled={
                roleSubmitting ||
                !isDirty({ role: newRole }, { role: userToChangeRole?.role })
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {roleSubmitting ? "Saving…" : "Save role"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-red-800 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading...
            </span>
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
                      Created
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
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                  {(user.username ?? "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.username}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                ID: {user._id}
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
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleBadgeClass(user.role ?? "")}`}
                            >
                              {roleLabel(user.role)}
                            </span>
                            {user.status === "pending" && (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                Invited
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatDate(user.createdAt?.toString())}
                        </td>
                        <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                          {!canManage ? (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          ) : (
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
                                className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                aria-expanded={openActionsId === user._id}
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
                                      openChangeRole(user);
                                      setOpenActionsId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                  >
                                    Change role
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openResetPassword(user);
                                      setOpenActionsId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                  >
                                    Reset password
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteConfirm(user);
                                      setOpenActionsId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
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
                  Showing {(pagination.currentPage - 1) * pagination.limit + 1}{" "}
                  to{" "}
                  {Math.min(
                    pagination.currentPage * pagination.limit,
                    pagination.totalUsers,
                  )}{" "}
                  of {pagination.totalUsers} results
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {users && users?.length === 0 && !loading && (
              <NoData>No users found</NoData>
            )}
          </>
        )}
      </div>
    </div>
  );
}
