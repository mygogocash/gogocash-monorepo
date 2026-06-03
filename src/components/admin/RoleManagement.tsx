"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { useRolesQuery, ROLES_QUERY_KEY } from "@/hooks/useRoles";
import { Modal } from "@/components/ui/modal";
import { devError } from "@/lib/devConsole";
import {
  ALL_PERMISSIONS,
  RESOURCES,
  roleBadgeClass,
  type Permission,
} from "@/lib/rbac";
import type { RoleDef } from "@/types/api";

const resourceLabel = (r: string) =>
  r.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const PERMISSION_GROUPS = RESOURCES.map((r) => ({
  resource: r as string,
  permissions: ALL_PERMISSIONS.filter((p) => p.startsWith(`${r}:`)),
}));

const SUPER_ADMIN = "super_admin";

export default function RoleManagement() {
  const { createRole, updateRole, deleteRole, error, clearError } = useApi();
  const { can } = usePermissions();
  const canManage = can("adminUsers:manage");
  const qc = useQueryClient();

  const { data, isLoading } = useRolesQuery();
  const roles = data?.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDef | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<Set<Permission>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const [roleToDelete, setRoleToDelete] = useState<RoleDef | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ROLES_QUERY_KEY });

  function openCreate() {
    setEditing(null);
    setLabel("");
    setDescription("");
    setPerms(new Set());
    clearError();
    setFormOpen(true);
  }
  function openEdit(role: RoleDef) {
    setEditing(role);
    setLabel(role.label);
    setDescription(role.description ?? "");
    setPerms(new Set(role.permissions));
    clearError();
    setFormOpen(true);
  }
  function togglePerm(p: Permission) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function submit() {
    if (!label.trim()) return;
    setSubmitting(true);
    clearError();
    try {
      if (editing) {
        await updateRole(editing.id, {
          label: label.trim(),
          description,
          permissions: [...perms],
        });
      } else {
        await createRole({
          label: label.trim(),
          description,
          permissions: [...perms],
        });
      }
      setFormOpen(false);
      await refresh();
    } catch (e) {
      devError("Failed to save role:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!roleToDelete) return;
    setDeleting(true);
    clearError();
    try {
      await deleteRole(roleToDelete.id);
      setRoleToDelete(null);
      await refresh();
    } catch (e) {
      devError("Failed to delete role:", e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Roles
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define what each role can see and do. Assign roles in Admin Users.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Create role
          </button>
        )}
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading roles…
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex min-w-0 flex-col rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleBadgeClass(role.id)}`}
                      >
                        {role.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {role.system ? "System" : "Custom"}
                      </span>
                    </div>
                    {role.description && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {role.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {role.permissions.length} permission
                      {role.permissions.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-2">
                      {role.id !== SUPER_ADMIN && (
                        <button
                          type="button"
                          onClick={() => openEdit(role)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Edit
                        </button>
                      )}
                      {!role.system && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoleToDelete(role);
                            clearError();
                          }}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit role modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        className="max-w-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editing ? `Edit role: ${editing.label}` : "Create role"}
        </h3>
        <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </span>
              <input
                type="text"
                value={label}
                disabled={submitting || editing?.system}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Finance Manager"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </span>
              <input
                type="text"
                value={description}
                disabled={submitting}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Permissions
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PERMISSION_GROUPS.map((group) => (
                <div
                  key={group.resource}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <p className="mb-2 text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
                    {resourceLabel(group.resource)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {group.permissions.map((p) => (
                      <label
                        key={p}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={perms.has(p)}
                          disabled={submitting}
                          onChange={() => togglePerm(p)}
                          className="text-brand-500 focus:ring-brand-500 size-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                        />
                        {p.split(":")[1]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => !submitting && setFormOpen(false)}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !label.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : editing ? "Save changes" : "Create role"}
          </button>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!roleToDelete}
        onClose={() => !deleting && setRoleToDelete(null)}
        className="max-w-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Delete role
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Delete <strong>{roleToDelete?.label}</strong>? Admin users still
          assigned to it will fall back to least-privilege access.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => !deleting && setRoleToDelete(null)}
            disabled={deleting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
