"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher, fetcherPut } from "@/lib/axios/client";
import { ResCategoryList } from "@/types/category";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { pathImage } from "@/utils/helper";
import toast from "react-hot-toast";

const POLICY_MAX_LENGTH = 50000;

export default function PolicyTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ResCategoryList | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ResCategoryList[]>({
    queryKey: ["getCategory", "policy-page"],
    queryFn: () => fetcher("/offer/get-category/list"),
    staleTime: 60_000,
  });

  const { data: policiesList = {}, isLoading: loadingPolicies } = useQuery<Record<string, string>>({
    queryKey: ["policyList"],
    queryFn: () => fetcher("/policy/list"),
    staleTime: 0,
  });

  const filteredCategories = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : categories;

  const openModal = useCallback((category: ResCategoryList) => {
    setSelectedCategory(category);
    setEditContent(policiesList[category._id] ?? "");
    setConfirmClear(false);
  }, [policiesList]);

  const closeModal = useCallback(() => {
    setSelectedCategory(null);
    setEditContent("");
    setConfirmClear(false);
  }, []);

  const handleSave = async () => {
    if (!selectedCategory) return;
    const content = editContent.slice(0, POLICY_MAX_LENGTH).trim();
    setSaving(true);
    try {
      await fetcherPut("/policy", {
        data: { categoryId: selectedCategory._id, content },
      });
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      toast.success("Terms & conditions saved.");
      closeModal();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "data" in err && typeof (err as { data?: { message?: string } }).data?.message === "string"
        ? (err as { data: { message: string } }).data.message
        : "Failed to save.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearClick = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    void handleClearConfirm();
  };

  const handleClearConfirm = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    try {
      await fetcherPut("/policy", {
        data: { categoryId: selectedCategory._id, content: "" },
      });
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      toast.success("Terms & conditions cleared.");
      closeModal();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "data" in err && typeof (err as { data?: { message?: string } }).data?.message === "string"
        ? (err as { data: { message: string } }).data.message
        : "Failed to clear.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isOverLength = editContent.length > POLICY_MAX_LENGTH;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Terms &amp; conditions by category
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {filteredCategories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {loadingCategories || loadingPolicies ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">T&amp;C status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {filteredCategories.map((category, index) => {
                    const content = policiesList[category._id] ?? "";
                    const isSet = content.length > 0;
                    return (
                      <tr key={category._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-6 py-4">{index + 1}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              {category.image ? (
                                <img
                                  className="h-12 w-12 rounded-lg object-cover"
                                  src={pathImage(category.image)}
                                  alt={category.name}
                                  width={48}
                                  height={48}
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-300 dark:bg-gray-600">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                    {category.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {category.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isSet
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {isSet ? "Set" : "Not set"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => openModal(category)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            View / Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredCategories.length === 0 && !loadingCategories && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No categories found.
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={!!selectedCategory} onClose={closeModal} isFullscreen>
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Terms &amp; conditions — {selectedCategory?.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Edit the terms and conditions for this category. Users may see this text when engaging with offers in this category.
          </p>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <label htmlFor="policy-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Content
            </label>
            <textarea
              id="policy-content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Enter terms and conditions (plain text)..."
              className="mt-1 min-h-0 flex-1 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />
            <p className={`mt-1 shrink-0 text-xs ${isOverLength ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
              {editContent.length} / {POLICY_MAX_LENGTH} characters
            </p>
          </div>

          <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-3">
            {confirmClear ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">Clear all content?</span>
                <Button variant="outline" onClick={() => setConfirmClear(false)}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearClick}
                  disabled={saving}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {saving ? "Clearing…" : "Yes, clear"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearClick}
                  disabled={!editContent.trim()}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Clear T&amp;C
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || isOverLength}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
