"use client";

import React, { useState, useCallback, useMemo, useLayoutEffect } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataSession } from "@/hooks/useDataSession";
import client, { fetcher, fetcherPut } from "@/lib/axios/client";
import { ResCategoryList } from "@/types/category";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { pathImage } from "@/utils/helper";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import toast from "react-hot-toast";
import {
  DEFAULT_POLICY_TEMPLATES,
  POLICY_TRANSLATION_LOCALES,
  composeTemplatePlus,
  getTemplateById,
  parseStoredPolicy,
  serializePolicyForSave,
  type ParsedPolicy,
} from "@/lib/policyPayload";

const POLICY_MAX_LENGTH = 50000;
const STORED_MAX_LENGTH = 52000;

type ContentSource = NonNullable<ParsedPolicy["contentSource"]>;

type PolicyModalTab = "banner" | "terms";

type UpdateCategoryResponse = {
  success?: boolean;
  data?: ResCategoryList;
};

export default function PolicyTable() {
  const queryClient = useQueryClient();
  const session = useDataSession();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ResCategoryList | null>(null);
  const [contentSource, setContentSource] = useState<ContentSource>("custom");
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_POLICY_TEMPLATES[0]!.id);
  const [editPrimary, setEditPrimary] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [translationLocale, setTranslationLocale] = useState("th");
  const [showAdminTranslation, setShowAdminTranslation] = useState(false);
  const [savedPreview, setSavedPreview] = useState<ParsedPolicy | null>(null);
  const [rawSaved, setRawSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [bannerDraft, setBannerDraft] = useState<File | null>(null);
  const [bannerObjectUrl, setBannerObjectUrl] = useState<string | null>(null);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<PolicyModalTab>("terms");

  useLayoutEffect(() => {
    if (!bannerDraft) {
      setBannerObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(bannerDraft);
    setBannerObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerDraft]);

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

  const selectedTemplate = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId],
  );

  const effectivePrimaryLength = useMemo(() => {
    if (contentSource === "template_plus" && selectedTemplate) {
      return composeTemplatePlus(selectedTemplate.body, additionalTerms).length;
    }
    return editPrimary.length;
  }, [contentSource, selectedTemplate, additionalTerms, editPrimary]);

  const isOverLength =
    effectivePrimaryLength > POLICY_MAX_LENGTH ||
    editTranslation.length > POLICY_MAX_LENGTH;

  const openModal = useCallback(
    (category: ResCategoryList) => {
      const raw = policiesList[category._id] ?? "";
      const parsed = parseStoredPolicy(raw);
      setSelectedCategory(category);
      setRawSaved(raw);
      setSavedPreview(parsed);
      setContentSource(parsed.contentSource ?? "custom");
      setSelectedTemplateId(parsed.templateId ?? DEFAULT_POLICY_TEMPLATES[0]!.id);
      setAdditionalTerms(parsed.additionalTerms ?? "");
      setEditTranslation(parsed.translation ?? "");
      setTranslationLocale(parsed.translationLocale ?? "th");
      setShowAdminTranslation((parsed.translation ?? "").trim().length > 0);
      setConfirmClear(false);
      setBannerDraft(null);
      setPolicyModalTab("terms");

      setEditPrimary(parsed.primary);
    },
    [policiesList],
  );

  const closeModal = useCallback(() => {
    setSelectedCategory(null);
    setEditPrimary("");
    setAdditionalTerms("");
    setEditTranslation("");
    setSavedPreview(null);
    setRawSaved("");
    setContentSource("custom");
    setShowAdminTranslation(false);
    setConfirmClear(false);
    setBannerDraft(null);
    setPolicyModalTab("terms");
  }, []);

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setBannerDraft(file);
  };

  const handleBannerUpload = async () => {
    if (!selectedCategory || !bannerDraft) return;
    setBannerSaving(true);
    try {
      const formData = new FormData();
      formData.append("banner", bannerDraft);
      const res = await client.patch<UpdateCategoryResponse>(
        `/admin/update-category/${selectedCategory._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken ?? ""}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const body = res.data;
      if (body?.data) {
        setSelectedCategory((prev) =>
          prev && prev._id === body.data!._id ? { ...prev, ...body.data } : prev,
        );
      }
      setBannerDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["getCategory"] });
      toast.success("Banner updated.");
    } catch {
      toast.error("Failed to upload banner.");
    } finally {
      setBannerSaving(false);
    }
  };

  const handleContentSourceChange = (next: ContentSource) => {
    const tid = selectedTemplateId;
    const tmpl = getTemplateById(tid);
    if (next === "custom" && contentSource === "template_plus" && tmpl) {
      setEditPrimary(composeTemplatePlus(tmpl.body, additionalTerms));
      setAdditionalTerms("");
    }
    setContentSource(next);
    if (next === "template" && tmpl) {
      setEditPrimary(tmpl.body);
      setAdditionalTerms("");
    } else if (next === "template_plus") {
      setAdditionalTerms((prev) => prev);
    }
  };

  const handleTemplateSelectChange = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = getTemplateById(id);
    if (!tmpl) return;
    if (contentSource === "template") {
      setEditPrimary(tmpl.body);
    }
  };

  const handleSave = async () => {
    if (!selectedCategory) return;
    const payload = {
      primary: editPrimary,
      translation: showAdminTranslation ? editTranslation : "",
      translationLocale,
      contentSource,
      templateId:
        contentSource === "template" || contentSource === "template_plus"
          ? selectedTemplateId
          : null,
      additionalTerms,
    };
    const serialized = serializePolicyForSave(payload);
    if (serialized.length > STORED_MAX_LENGTH) {
      toast.error("Content is too long. Shorten text or translation.");
      return;
    }
    setSaving(true);
    try {
      await fetcherPut([
        "/policy",
        { data: { categoryId: selectedCategory._id, content: serialized } },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      toast.success("Terms & conditions saved.");
      closeModal();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && typeof (err as { data?: { message?: string } }).data?.message === "string"
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
      await fetcherPut([
        "/policy",
        { data: { categoryId: selectedCategory._id, content: "" } },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      toast.success("Terms & conditions cleared.");
      closeModal();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && typeof (err as { data?: { message?: string } }).data?.message === "string"
          ? (err as { data: { message: string } }).data.message
          : "Failed to clear.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const hasSavedContent = rawSaved.trim().length > 0;

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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Banner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">T&amp;C status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {filteredCategories.map((category, index) => {
                    const content = policiesList[category._id] ?? "";
                    const isSet = content.length > 0;
                    return (
                      <tr
                        key={category._id}
                        tabIndex={0}
                        aria-label={`View or edit policy and banner for ${category.name}`}
                        onClick={() => openModal(category)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openModal(category);
                          }
                        }}
                        className="cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800 dark:focus-visible:ring-brand-400/40 dark:focus-visible:ring-offset-gray-900"
                      >
                        <td className="whitespace-nowrap px-6 py-4">{index + 1}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              {category.image ? (
                                <Image
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
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {category.banner ? (
                            <RemoteOrBlobImage
                              className="h-14 w-36 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                              src={pathImage(category.banner, "banner")}
                              alt={`${category.name} banner`}
                              width={144}
                              height={56}
                            />
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
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
                          <span
                            className="pointer-events-none inline-flex rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            aria-hidden
                          >
                            View / Edit
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredCategories.length === 0 && !loadingCategories && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">No categories found.</div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={!!selectedCategory} onClose={closeModal} isFullscreen>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedCategory?.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {policyModalTab === "banner"
              ? "Upload or replace the wide banner image for this category in the app."
              : "Choose a default template, combine a template with your own clauses, or write custom text. Optional admin translation is stored with the policy."}
          </p>

          <div
            className="mt-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
            role="tablist"
            aria-label="Category policy sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={policyModalTab === "banner"}
              onClick={() => {
                setPolicyModalTab("banner");
                setConfirmClear(false);
              }}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                policyModalTab === "banner"
                  ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
              }`}
            >
              Category banner
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={policyModalTab === "terms"}
              onClick={() => setPolicyModalTab("terms")}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                policyModalTab === "terms"
                  ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
              }`}
            >
              Terms &amp; conditions
            </button>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {policyModalTab === "banner" && selectedCategory ? (
            <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/20">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Current banner
                  </p>
                  {selectedCategory.banner ? (
                    <RemoteOrBlobImage
                      className="max-h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                      src={pathImage(selectedCategory.banner, "banner")}
                      alt={`${selectedCategory.name} current banner`}
                      width={640}
                      height={200}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No banner uploaded yet.</p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    New upload preview
                  </p>
                  {bannerObjectUrl ? (
                    <RemoteOrBlobImage
                      className="max-h-40 w-full rounded-lg border-2 border-dashed border-brand-400 object-cover dark:border-brand-500"
                      src={bannerObjectUrl}
                      alt="Selected banner preview"
                      width={640}
                      height={200}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Choose an image file to see a preview here.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label htmlFor="policy-category-banner" className="sr-only">
                    Upload category banner
                  </label>
                  <input
                    id="policy-category-banner"
                    key={selectedCategory._id}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="block w-full cursor-pointer text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-200 dark:text-gray-400 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!bannerDraft || bannerSaving}
                  onClick={() => void handleBannerUpload()}
                >
                  {bannerSaving ? "Uploading…" : "Upload banner"}
                </Button>
              </div>
            </section>
          ) : null}

          {policyModalTab === "terms" ? (
            <>
          {hasSavedContent && savedPreview && (
            <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40">
              <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
                Current saved version (read-only)
              </summary>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Default / primary text
                  </p>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                    {savedPreview.primary || "—"}
                  </pre>
                </div>
                {savedPreview.translation.trim() ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Admin translation ({savedPreview.translationLocale})
                    </p>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                      {savedPreview.translation}
                    </pre>
                  </div>
                ) : null}
                {rawSaved.trim().startsWith("{") ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Stored as structured policy (JSON) because translation or template+ metadata is included. Client apps should use the parsed{" "}
                    <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">primary</code> field for display when possible.
                  </p>
                ) : null}
              </div>
            </details>
          )}

          <div className="mt-4 space-y-4">
            <fieldset>
              <legend className="text-sm font-medium text-gray-800 dark:text-gray-200">How do you want to set terms?</legend>
              <div className="mt-2 flex flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="policy-source"
                    className="mt-1"
                    checked={contentSource === "template"}
                    onChange={() => handleContentSourceChange("template")}
                  />
                  <span>
                    <span className="font-medium">Use a default template</span>
                    <span className="block text-gray-500 dark:text-gray-400">
                      Pick a preset and edit the text below before saving.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="policy-source"
                    className="mt-1"
                    checked={contentSource === "template_plus"}
                    onChange={() => handleContentSourceChange("template_plus")}
                  />
                  <span>
                    <span className="font-medium">Default template + your additional terms</span>
                    <span className="block text-gray-500 dark:text-gray-400">
                      Keep the selected template and add your own section (appended with a clear separator).
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="policy-source"
                    className="mt-1"
                    checked={contentSource === "custom"}
                    onChange={() => handleContentSourceChange("custom")}
                  />
                  <span>
                    <span className="font-medium">Write everything yourself</span>
                    <span className="block text-gray-500 dark:text-gray-400">Free-form text only.</span>
                  </span>
                </label>
              </div>
            </fieldset>

            {(contentSource === "template" || contentSource === "template_plus") && (
              <div>
                <label htmlFor="policy-template" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default template
                </label>
                <select
                  id="policy-template"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelectChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {DEFAULT_POLICY_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {selectedTemplate ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selectedTemplate.description}</p>
                ) : null}
              </div>
            )}

            {contentSource === "template_plus" && selectedTemplate ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Template preview (included in saved policy)</p>
                  <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-200">
                    {selectedTemplate.body}
                  </pre>
                </div>
                <div>
                  <label htmlFor="policy-additional" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your additional terms
                  </label>
                  <textarea
                    id="policy-additional"
                    value={additionalTerms}
                    onChange={(e) => setAdditionalTerms(e.target.value)}
                    placeholder="Add clauses specific to this category (plain text)..."
                    className="mt-1 min-h-[120px] w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>
            ) : null}

            {(contentSource === "template" || contentSource === "custom") && (
              <div className="min-h-0 flex-1">
                <label htmlFor="policy-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {contentSource === "template" ? "Template text (editable)" : "Content"}
                </label>
                <textarea
                  id="policy-content"
                  value={editPrimary}
                  onChange={(e) => setEditPrimary(e.target.value)}
                  placeholder="Enter terms and conditions (plain text)..."
                  className="mt-1 min-h-[200px] w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            )}

            <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={showAdminTranslation}
                  onChange={(e) => setShowAdminTranslation(e.target.checked)}
                />
                Add admin-provided translation (optional)
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                For a second language, enter text your app can show when the user’s locale matches. This is separate from framework i18n for UI labels.
              </p>
              {showAdminTranslation ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor="policy-locale" className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Translation language
                  </label>
                  <select
                    id="policy-locale"
                    value={translationLocale}
                    onChange={(e) => setTranslationLocale(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {POLICY_TRANSLATION_LOCALES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={editTranslation}
                    onChange={(e) => setEditTranslation(e.target.value)}
                    placeholder="Translated terms (plain text)..."
                    className="min-h-[140px] w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                  />
                  <p
                    className={`text-xs ${editTranslation.length > POLICY_MAX_LENGTH ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    Translation: {editTranslation.length} / {POLICY_MAX_LENGTH} characters
                  </p>
                </div>
              ) : null}
            </div>

            <p
              className={`text-xs ${isOverLength ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              Primary text: {effectivePrimaryLength} / {POLICY_MAX_LENGTH} characters
            </p>
          </div>
            </>
          ) : null}
          </div>

          <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            {policyModalTab === "banner" ? (
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
            ) : confirmClear ? (
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
                  disabled={
                    !hasSavedContent &&
                    !editPrimary.trim() &&
                    !(contentSource === "template_plus" && additionalTerms.trim()) &&
                    !editTranslation.trim()
                  }
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Clear T&amp;C
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saving || isOverLength}>
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
