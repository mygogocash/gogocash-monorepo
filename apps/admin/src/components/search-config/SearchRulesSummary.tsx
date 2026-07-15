"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import StatusTag from "@/components/ui/StatusTag";
import { deleteSearchRule, putSearchRule } from "@/lib/api/adminModulesApi";
import { formatDateTime } from "@/lib/dateFormat";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type {
  SearchRule,
  SearchRuleInput,
  SearchRuleTreatment,
} from "@/types/adminModules";
import {
  normalizeSearchRuleKeywords,
  SEARCH_RULES_QUERY_KEY,
  SEARCH_RULE_TREATMENTS,
} from "./searchRuleUi";

const TREATMENT_BADGES: Record<
  SearchRuleTreatment,
  { label: string; className: string }
> = {
  pinned: {
    label: "Pinned",
    className:
      "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  },
  boost: {
    label: "Boost",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

type EditDraft = {
  id: string;
  label: string;
  treatment: SearchRuleTreatment;
  keywords: string;
  weight: string;
  isActive: boolean;
};

function ruleLabel(rule: SearchRule): string {
  return rule.offer_name?.trim() || rule.offer_id;
}

export default function SearchRulesSummary({
  rules,
  canManage,
}: {
  rules: SearchRule[];
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const updateRule = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<SearchRuleInput>;
    }) => putSearchRule(id, body),
    onSuccess: () => {
      setEditDraft(null);
      toast.success("Search rule updated");
      void queryClient.invalidateQueries({ queryKey: SEARCH_RULES_QUERY_KEY });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          "Could not update the search rule. Please try again, or contact an administrator if it continues.",
        ),
      ),
  });

  const deleteRule = useMutation({
    mutationFn: deleteSearchRule,
    onSuccess: () => {
      toast.success("Search rule deleted");
      void queryClient.invalidateQueries({ queryKey: SEARCH_RULES_QUERY_KEY });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          "Could not delete the search rule. Please try again, or contact an administrator if it continues.",
        ),
      ),
  });

  function beginEditing(rule: SearchRule) {
    setEditDraft({
      id: rule.id,
      label: ruleLabel(rule),
      treatment: rule.treatment,
      keywords: rule.keywords.join(", "),
      weight: rule.weight === undefined ? "" : String(rule.weight),
      isActive: rule.is_active,
    });
  }

  function saveEdit() {
    if (!editDraft) return;
    const parsedWeight = editDraft.weight.trim()
      ? Number(editDraft.weight)
      : undefined;
    updateRule.mutate({
      id: editDraft.id,
      body: {
        treatment: editDraft.treatment,
        keywords: normalizeSearchRuleKeywords(editDraft.keywords),
        ...(editDraft.treatment === "boost" && Number.isFinite(parsedWeight)
          ? { weight: parsedWeight }
          : {}),
        is_active: editDraft.isActive,
      },
    });
  }

  function confirmDelete(rule: SearchRule) {
    const label = ruleLabel(rule);
    if (!window.confirm(`Delete the search rule for ${label}?`)) return;
    deleteRule.mutate(rule.id);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Search Config
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Persisted brand rules applied to customer search results.
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No search rules configured yet.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {[
                  "Brand",
                  "Treatment",
                  "Keywords",
                  "Weight",
                  "State",
                  "Updated",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rules.map((rule) => {
                const label = ruleLabel(rule);
                const badge = TREATMENT_BADGES[rule.treatment];
                const isEditing = editDraft?.id === rule.id;
                return isEditing && editDraft ? (
                  <tr key={rule.id} className="bg-white dark:bg-gray-900">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          Treatment
                          <select
                            aria-label={`Treatment for ${label}`}
                            value={editDraft.treatment}
                            onChange={(event) =>
                              setEditDraft((draft) =>
                                draft
                                  ? {
                                      ...draft,
                                      treatment: event.target
                                        .value as SearchRuleTreatment,
                                    }
                                  : draft,
                              )
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          >
                            {SEARCH_RULE_TREATMENTS.map((treatment) => (
                              <option
                                key={treatment.value}
                                value={treatment.value}
                              >
                                {treatment.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          Keywords
                          <Input
                            ariaLabel={`Keywords for ${label}`}
                            value={editDraft.keywords}
                            onChange={(event) =>
                              setEditDraft((draft) =>
                                draft
                                  ? { ...draft, keywords: event.target.value }
                                  : draft,
                              )
                            }
                            placeholder="Comma-separated keywords"
                          />
                        </label>
                        {editDraft.treatment === "boost" ? (
                          <label className="text-sm text-gray-700 dark:text-gray-300">
                            Weight
                            <Input
                              type="number"
                              min="0"
                              max="1000"
                              ariaLabel={`Weight for ${label}`}
                              value={editDraft.weight}
                              onChange={(event) =>
                                setEditDraft((draft) =>
                                  draft
                                    ? { ...draft, weight: event.target.value }
                                    : draft,
                                )
                              }
                            />
                          </label>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Weight only applies to boost rules.
                          </div>
                        )}
                        <div className="flex items-end pb-2">
                          <Switch
                            label="Active"
                            ariaLabel={`Active ${label}`}
                            checked={editDraft.isActive}
                            onChange={(isActive) =>
                              setEditDraft((draft) =>
                                draft ? { ...draft, isActive } : draft,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <SecondaryButton
                          variant="blue"
                          disabled={updateRule.isPending}
                          onClick={saveEdit}
                        >
                          Save changes
                        </SecondaryButton>
                        <SecondaryButton
                          disabled={updateRule.isPending}
                          onClick={() => setEditDraft(null)}
                        >
                          Cancel
                        </SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={rule.id} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      <div>{label}</div>
                      <div className="text-xs font-normal text-gray-400">
                        {rule.offer_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusTag className={badge.className}>
                        {badge.label}
                      </StatusTag>
                    </td>
                    <td className="px-4 py-3">
                      {rule.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">All searches</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {rule.weight ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusTag
                        className={
                          rule.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </StatusTag>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDateTime(rule.updatedAt, { seconds: false })}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`Edit ${label}`}
                            onClick={() => beginEditing(rule)}
                            className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${label}`}
                            disabled={deleteRule.isPending}
                            onClick={() => confirmDelete(rule)}
                            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Read only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
