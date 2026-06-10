"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataSession } from "@/hooks/useDataSession";
import client, { fetcher, fetcherPut } from "@/lib/axios/client";
import { ResCategoryList } from "@/types/category";
import NoData from "@/components/common/NoData";
import Button from "@/components/ui/button/Button";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import CategoryIcon from "./CategoryIcon";
import TimeFieldHM from "@/components/form/input/TimeFieldHM";
import { isDirty } from "@/lib/isDirty";
import toast from "react-hot-toast";
import {
  DEFAULT_POLICY_TEMPLATES,
  POLICY_TRANSLATION_LOCALES,
  asNonEmptyParsed,
  buildSavePayload,
  composeTemplatePlus,
  emptyParsedPolicy,
  getTemplateBody,
  getTemplateById,
  parseStoredPolicy,
  totalTranslationLength,
  type ParsedPolicy,
} from "@/lib/policyPayload";

/** Per-locale soft cap. Backend enforces the hard cap at 50_000 per locale. */
const POLICY_MAX_LENGTH = 50000;

type ContentSource = NonNullable<ParsedPolicy["contentSource"]>;

type PolicyModalTab = "banner" | "terms";

/** Empty state shown in a banner preview slot before any file is uploaded. */
function NoUploadedBanner() {
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800/30 dark:text-gray-500">
      <svg
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
      <div className="text-center">
        <p className="text-sm font-medium">No uploaded files</p>
        <p className="text-xs">Use “Upload File” to add a banner image.</p>
      </div>
    </div>
  );
}

/** Minimal shape returned by `GET /policy/category-list`. Backend documents
 *  may carry timestamps + Mongo internals — we only use what the editor needs. */
type PolicyListEntry = {
  _id?: string;
  category_id: string;
  banner?: unknown;
  terms?: unknown;
};

export default function PolicyTable() {
  const queryClient = useQueryClient();
  const session = useDataSession();
  const [selectedCategory, setSelectedCategory] =
    useState<ResCategoryList | null>(null);
  const [contentSource, setContentSource] = useState<ContentSource>("custom");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    DEFAULT_POLICY_TEMPLATES[0]!.id,
  );

  // V2 multi-language state — replaces the old (editPrimary, editTranslation,
  // translationLocale, showAdminTranslation) tuple. `translations` is keyed by
  // locale code ("th", "en", "ja", ...). `primaryLocale` marks the canonical
  // source language so the customer-side renderer has a deterministic fallback.
  // `activeLocale` is purely UI state — which tab the editor is currently on.
  const [primaryLocale, setPrimaryLocale] = useState<string>("th");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [additionalTermsByLocale, setAdditionalTermsByLocale] = useState<
    Record<string, string>
  >({});
  const [activeLocale, setActiveLocale] = useState<string>("th");
  // Phase 3A.2 — banner text editor state (sister of `translations`,
  // `primaryLocale`, `activeLocale`). Banner has no template machinery,
  // so we don't need contentSource/templateId/additionalTerms here.
  // 500-char per-locale soft cap (BA3 in POLICY_MULTILANG_PLAN.md).
  const [bannerPrimaryLocale, setBannerPrimaryLocale] = useState<string>("th");
  const [bannerTranslations, setBannerTranslations] = useState<
    Record<string, string>
  >({});
  const [bannerActiveLocale, setBannerActiveLocale] = useState<string>("th");
  const [savedPreview, setSavedPreview] = useState<ParsedPolicy | null>(null);
  const [hasExistingPolicy, setHasExistingPolicy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  // Uploaded banner per section (object-URL preview + filename). Replaces the
  // preset preview once a file is chosen via "Upload File".
  const [defaultUpload, setDefaultUpload] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [specialUpload, setSpecialUpload] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const defaultFileRef = useRef<HTMLInputElement>(null);
  const specialFileRef = useRef<HTMLInputElement>(null);
  // Period during which the special event banner replaces the default. Date +
  // 24-hour HH:MM (TimeFieldHM) so the time never renders as 12-hour AM/PM.
  const [specialEventStartDate, setSpecialEventStartDate] = useState("");
  const [specialEventStartTime, setSpecialEventStartTime] = useState("");
  const [specialEventEndDate, setSpecialEventEndDate] = useState("");
  const [specialEventEndTime, setSpecialEventEndTime] = useState("");
  const [policyModalTab, setPolicyModalTab] = useState<PolicyModalTab>("terms");

  // Snapshot of the editable fields `handleSave` sends, captured the moment a
  // category modal opens (i.e. AFTER the loaded policy populates state). Drives
  // "disable Save until something changed". `bannerDraft` (the image upload) is
  // a separate save path with its own button, so it's intentionally excluded.
  type SaveSnapshot = {
    primaryLocale: string;
    translations: Record<string, string>;
    contentSource: ContentSource;
    selectedTemplateId: string;
    additionalTermsByLocale: Record<string, string>;
    bannerPrimaryLocale: string;
    bannerTranslations: Record<string, string>;
  };
  const initialSaveSnapshot = useRef<SaveSnapshot | null>(null);
  const currentSaveSnapshot: SaveSnapshot = {
    primaryLocale,
    translations,
    contentSource,
    selectedTemplateId,
    additionalTermsByLocale,
    bannerPrimaryLocale,
    bannerTranslations,
  };
  const hasUnsavedChanges = isDirty(
    currentSaveSnapshot,
    initialSaveSnapshot.current,
  );

  const { data: categories = [], isLoading: loadingCategories } = useQuery<
    ResCategoryList[]
  >({
    queryKey: ["getCategory", "policy-page"],
    queryFn: () => fetcher("/offer/get-category/list"),
    staleTime: 60_000,
  });

  // Phase 2: switched from legacy `/policy/list` (Record<categoryId, JSON-string>)
  // to the new `/policy/category-list` (Policy[]). The shape change forces an
  // index-by-category-id step here so the rest of the component doesn't have
  // to know which version of the API is live.
  const { data: policiesData, isLoading: loadingPolicies } = useQuery<
    PolicyListEntry[]
  >({
    queryKey: ["policyList"],
    queryFn: () => fetcher("/policy/category-list"),
    staleTime: 0,
  });
  const policiesById = useMemo(() => {
    const map: Record<string, PolicyListEntry> = {};
    // The endpoint/mock may yield a non-array (e.g. an error body); guard so this
    // loop never throws "policiesArray is not iterable".
    const list = Array.isArray(policiesData) ? policiesData : [];
    for (const p of list) {
      if (p?.category_id) map[String(p.category_id)] = p;
    }
    return map;
  }, [policiesData]);

  const filteredCategories = categories;

  const selectedTemplate = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId],
  );

  // Per-locale length for the active tab (templates_plus appends additional terms inline).
  const activeLocaleLength = useMemo(() => {
    const txt = translations[activeLocale] ?? "";
    if (contentSource === "template_plus" && selectedTemplate) {
      return composeTemplatePlus(
        getTemplateBody(selectedTemplate.id, activeLocale),
        additionalTermsByLocale[activeLocale] ?? "",
      ).length;
    }
    return txt.length;
  }, [
    contentSource,
    selectedTemplate,
    translations,
    activeLocale,
    additionalTermsByLocale,
  ]);

  // Any single locale crossing the per-locale cap blocks the save. Same rule
  // the backend enforces — fail in the UI before we hit the network.
  const isOverLength = useMemo(
    () =>
      Object.values(translations).some(
        (t) => typeof t === "string" && t.length > POLICY_MAX_LENGTH,
      ),
    [translations],
  );

  const totalLength = useMemo(
    () => totalTranslationLength(translations),
    [translations],
  );

  const hasAnyTranslation = useMemo(
    () =>
      Object.values(translations).some(
        (t) => typeof t === "string" && t.trim().length > 0,
      ),
    [translations],
  );

  const openModal = useCallback(
    (category: ResCategoryList) => {
      // Read the V2 `terms` block (legacy V1 payloads are dual-read inside
      // `parseStoredPolicy`). The banner block is handled separately by the
      // existing image-upload UI and is not part of this multilang editor.
      const policy = policiesById[category._id];
      const parsed = policy?.terms
        ? parseStoredPolicy(policy.terms)
        : emptyParsedPolicy();
      const bannerParsed = policy?.banner
        ? parseStoredPolicy(policy.banner)
        : emptyParsedPolicy();
      setSelectedCategory(category);
      setHasExistingPolicy(Boolean(policy));
      setSavedPreview(parsed);
      setContentSource(parsed.contentSource ?? "custom");
      setSelectedTemplateId(
        parsed.templateId ?? DEFAULT_POLICY_TEMPLATES[0]!.id,
      );
      setPrimaryLocale(parsed.primary_locale || "th");
      setTranslations({ ...parsed.translations });
      setAdditionalTermsByLocale({ ...parsed.additionalTerms });
      // Banner state — Phase 3A.2 — populated from the same Policy doc.
      setBannerPrimaryLocale(bannerParsed.primary_locale || "th");
      setBannerTranslations({ ...bannerParsed.translations });
      const bannerPopulated = Object.entries(bannerParsed.translations)
        .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
        .sort((a, b) => b[1].length - a[1].length);
      setBannerActiveLocale(
        bannerPopulated[0]?.[0] ?? bannerParsed.primary_locale ?? "th",
      );
      // Open on the locale that has the most content; falls back to primary.
      const populated = Object.entries(parsed.translations)
        .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
        .sort((a, b) => b[1].length - a[1].length);
      setActiveLocale(populated[0]?.[0] ?? parsed.primary_locale ?? "th");
      setConfirmClear(false);
      setDefaultUpload(null);
      setSpecialUpload(null);
      setSpecialEventStartDate("");
      setSpecialEventStartTime("");
      setSpecialEventEndDate("");
      setSpecialEventEndTime("");
      setPolicyModalTab("terms");
      // Baseline for "disable Save until changed". Built from the same parsed
      // values used in the setters above (state updates are async, so we can't
      // read them back here). Mirrors `currentSaveSnapshot` exactly.
      const nextContentSource = parsed.contentSource ?? "custom";
      initialSaveSnapshot.current = {
        primaryLocale: parsed.primary_locale || "th",
        translations: { ...parsed.translations },
        contentSource: nextContentSource,
        selectedTemplateId:
          parsed.templateId ?? DEFAULT_POLICY_TEMPLATES[0]!.id,
        additionalTermsByLocale: { ...parsed.additionalTerms },
        bannerPrimaryLocale: bannerParsed.primary_locale || "th",
        bannerTranslations: { ...bannerParsed.translations },
      };
    },
    [policiesById],
  );

  const closeModal = useCallback(() => {
    setSelectedCategory(null);
    setTranslations({});
    setAdditionalTermsByLocale({});
    setSavedPreview(null);
    setHasExistingPolicy(false);
    setContentSource("custom");
    setPrimaryLocale("th");
    setActiveLocale("th");
    setBannerPrimaryLocale("th");
    setBannerTranslations({});
    setBannerActiveLocale("th");
    setConfirmClear(false);
    setPolicyModalTab("terms");
  }, []);

  // "Upload File" handlers — read the chosen image into an object-URL preview
  // (revoking any prior one). Data is mock, so the upload stays client-side.
  const handleDefaultUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (defaultUpload) URL.revokeObjectURL(defaultUpload.url);
    setDefaultUpload({ url: URL.createObjectURL(file), name: file.name });
    toast.success(`Uploaded ${file.name}`);
  };

  const handleSpecialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (specialUpload) URL.revokeObjectURL(specialUpload.url);
    setSpecialUpload({ url: URL.createObjectURL(file), name: file.name });
    toast.success(`Uploaded ${file.name}`);
  };

  // Clear an uploaded banner — back to the "No uploaded files" state.
  const handleRemoveDefault = () => {
    if (defaultUpload) URL.revokeObjectURL(defaultUpload.url);
    setDefaultUpload(null);
    if (defaultFileRef.current) defaultFileRef.current.value = "";
  };

  const handleRemoveSpecial = () => {
    if (specialUpload) URL.revokeObjectURL(specialUpload.url);
    setSpecialUpload(null);
    if (specialFileRef.current) specialFileRef.current.value = "";
  };

  // Templates apply to the ACTIVE locale only — admins translate per-locale,
  // not by retemplating every locale at once. If you want all locales to use
  // the same template, switch tabs and re-apply.
  const handleContentSourceChange = (next: ContentSource) => {
    const tid = selectedTemplateId;
    const tmpl = getTemplateById(tid);
    if (next === "custom" && contentSource === "template_plus" && tmpl) {
      const merged = composeTemplatePlus(
        getTemplateBody(tmpl.id, activeLocale),
        additionalTermsByLocale[activeLocale] ?? "",
      );
      setTranslations((prev) => ({ ...prev, [activeLocale]: merged }));
      setAdditionalTermsByLocale((prev) => ({ ...prev, [activeLocale]: "" }));
    }
    setContentSource(next);
    if (next === "template" && tmpl) {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: getTemplateBody(tmpl.id, activeLocale),
      }));
      setAdditionalTermsByLocale((prev) => ({ ...prev, [activeLocale]: "" }));
    }
  };

  const handleTemplateSelectChange = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = getTemplateById(id);
    if (!tmpl) return;
    if (contentSource === "template") {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: getTemplateBody(tmpl.id, activeLocale),
      }));
    }
  };

  const handleSave = async () => {
    if (!selectedCategory) return;
    if (isOverLength) {
      toast.error("One or more translations exceed 50,000 characters.");
      return;
    }
    // Phase 3A.2 — `asNonEmptyParsed` decides whether each block is
    // worth sending. Empty blocks become undefined, which buildSavePayload
    // omits from the payload, which prevents the backend's $set from
    // clobbering existing server-side content.
    const termsParsed = asNonEmptyParsed({
      primary_locale: primaryLocale,
      translations,
      contentSource,
      templateId:
        contentSource === "template" || contentSource === "template_plus"
          ? selectedTemplateId
          : null,
      additionalTerms: additionalTermsByLocale,
    });
    const bannerParsed = asNonEmptyParsed({
      primary_locale: bannerPrimaryLocale,
      translations: bannerTranslations,
      contentSource: "custom",
      templateId: null,
      additionalTerms: {},
    });
    if (!termsParsed && !bannerParsed) {
      toast.error(
        "Add at least one non-empty translation to banner or terms before saving.",
      );
      return;
    }
    setSaving(true);
    try {
      await fetcherPut([
        "/policy",
        {
          data: buildSavePayload({
            categoryId: selectedCategory._id,
            bannerParsed,
            termsParsed,
          }),
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      toast.success("Terms & conditions saved.");
      closeModal();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        typeof (err as { data?: { message?: string } }).data?.message ===
          "string"
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
      // DELETE /policy/category/:id removes the entire policy row (banner + terms).
      // Phase 2 only edits terms, so a "Clear T&C" today wipes both — accepted
      // simplification; banner image still lives on the Category record.
      await client.delete(`/policy/category/${selectedCategory._id}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ""}`,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      toast.success("Terms & conditions cleared.");
      closeModal();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        typeof (err as { data?: { message?: string } }).data?.message ===
          "string"
          ? (err as { data: { message: string } }).data.message
          : "Failed to clear.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const hasSavedContent =
    hasExistingPolicy &&
    !!savedPreview &&
    Object.values(savedPreview.translations || {}).some(
      (t) => typeof t === "string" && t.trim().length > 0,
    );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {selectedCategory ? (
        <div className="flex flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCategory?.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {policyModalTab === "banner"
                  ? "Upload or replace the wide banner image for this category in the app."
                  : "Choose a default template, combine a template with your own clauses, or write custom text. Optional admin translation is stored with the policy."}
              </p>
            </div>
            <Button variant="outline" onClick={closeModal} className="shrink-0">
              Close
            </Button>
          </div>

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

          <div className="mt-4">
            {policyModalTab === "banner" && selectedCategory ? (
              <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/20">
                {/* Default banner — preset preview, replaced by an uploaded file. */}
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Default banner
                    </h3>
                    {defaultUpload ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-green-500"
                          aria-hidden
                        />
                        Active Banner
                      </span>
                    ) : null}
                  </div>
                  {defaultUpload ? (
                    <RemoteOrBlobImage
                      className="max-h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                      src={defaultUpload.url}
                      alt="Default category banner"
                      width={640}
                      height={200}
                    />
                  ) : (
                    <NoUploadedBanner />
                  )}
                  <input
                    ref={defaultFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDefaultUpload}
                    className="hidden"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <SecondaryButton
                      type="button"
                      onClick={() => defaultFileRef.current?.click()}
                    >
                      Upload File
                    </SecondaryButton>
                    {defaultUpload ? (
                      <button
                        type="button"
                        onClick={handleRemoveDefault}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Special event banner — replaces the default for a set period. */}
                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Special event banner setup
                    </h3>
                    {specialUpload ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-yellow-500"
                          aria-hidden
                        />
                        Scheduled
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Temporarily replaces the default banner during the period
                    below.
                  </p>
                  {specialUpload ? (
                    <RemoteOrBlobImage
                      className="max-h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                      src={specialUpload.url}
                      alt="Special event banner"
                      width={640}
                      height={200}
                    />
                  ) : (
                    <NoUploadedBanner />
                  )}
                  <input
                    ref={specialFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSpecialUpload}
                    className="hidden"
                  />
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Starts (24h)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={specialEventStartDate}
                          onChange={(e) =>
                            setSpecialEventStartDate(e.target.value)
                          }
                          className="focus:border-brand-400 focus:ring-brand-500/20 h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <TimeFieldHM
                          value={specialEventStartTime}
                          onChange={setSpecialEventStartTime}
                          ariaLabel="Start time"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Ends (24h)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={specialEventEndDate}
                          onChange={(e) =>
                            setSpecialEventEndDate(e.target.value)
                          }
                          className="focus:border-brand-400 focus:ring-brand-500/20 h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <TimeFieldHM
                          value={specialEventEndTime}
                          onChange={setSpecialEventEndTime}
                          ariaLabel="End time"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <SecondaryButton
                      type="button"
                      onClick={() => specialFileRef.current?.click()}
                    >
                      Upload File
                    </SecondaryButton>
                    {specialUpload ? (
                      <button
                        type="button"
                        onClick={handleRemoveSpecial}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Phase 3A.2 — banner text editor (per-locale, ≤500 chars).
                  Saved on the same "Save" action as the Terms tab — both
                  blocks share the modal's Save button. */}
                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Banner text (per locale)
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Optional short caption rendered above the offer grid on the
                    customer side. Up to 500 characters per locale.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Primary locale:</span>
                    <select
                      value={bannerPrimaryLocale}
                      onChange={(e) => setBannerPrimaryLocale(e.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                    >
                      {POLICY_TRANSLATION_LOCALES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    className="mt-3 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700"
                    role="tablist"
                    aria-label="Banner translation locale"
                  >
                    {POLICY_TRANSLATION_LOCALES.map((l) => {
                      const filled =
                        typeof bannerTranslations[l.value] === "string" &&
                        bannerTranslations[l.value]!.trim().length > 0;
                      const isActive = bannerActiveLocale === l.value;
                      return (
                        <button
                          key={l.value}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setBannerActiveLocale(l.value)}
                          className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 rounded-full ${
                              filled
                                ? "bg-emerald-500"
                                : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                          {l.label}
                          {bannerPrimaryLocale === l.value ? (
                            <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ml-1 rounded px-1 py-0.5 text-[10px] font-medium">
                              primary
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={bannerTranslations[bannerActiveLocale] ?? ""}
                    onChange={(e) =>
                      setBannerTranslations((prev) => ({
                        ...prev,
                        [bannerActiveLocale]: e.target.value,
                      }))
                    }
                    maxLength={500}
                    placeholder={
                      bannerActiveLocale === "th"
                        ? "เช่น โปรโมชั่นพิเศษเดือนนี้ — รับแคชแบ็กเพิ่ม 5%..."
                        : "e.g. Special promotion this month — extra 5% cashback..."
                    }
                    className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 min-h-[80px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {
                      POLICY_TRANSLATION_LOCALES.find(
                        (l) => l.value === bannerActiveLocale,
                      )?.label
                    }
                    : {(bannerTranslations[bannerActiveLocale] ?? "").length} /
                    500 characters
                  </p>
                  <div className="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || isOverLength || !hasUnsavedChanges}
                      className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Primary locale:{" "}
                        <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
                          {savedPreview.primary_locale}
                        </code>
                      </p>
                      {Object.entries(savedPreview.translations).map(
                        ([locale, text]) => (
                          <div key={locale}>
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                              {POLICY_TRANSLATION_LOCALES.find(
                                (l) => l.value === locale,
                              )?.label ?? locale}
                              {locale === savedPreview.primary_locale
                                ? " (primary)"
                                : null}
                            </p>
                            <pre className="mt-1 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white p-3 whitespace-pre-wrap text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                              {text || "—"}
                            </pre>
                          </div>
                        ),
                      )}
                    </div>
                  </details>
                )}

                <div className="mt-4 space-y-4">
                  <fieldset>
                    <legend className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      How do you want to set terms?
                    </legend>
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
                          <span className="font-medium">
                            Use a default template
                          </span>
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
                          onChange={() =>
                            handleContentSourceChange("template_plus")
                          }
                        />
                        <span>
                          <span className="font-medium">
                            Default template + your additional terms
                          </span>
                          <span className="block text-gray-500 dark:text-gray-400">
                            Keep the selected template and add your own section
                            (appended with a clear separator).
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
                          <span className="font-medium">
                            Write everything yourself
                          </span>
                          <span className="block text-gray-500 dark:text-gray-400">
                            Free-form text only.
                          </span>
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  {(contentSource === "template" ||
                    contentSource === "template_plus") && (
                    <div>
                      <label
                        htmlFor="policy-template"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Default template
                      </label>
                      <select
                        id="policy-template"
                        value={selectedTemplateId}
                        onChange={(e) =>
                          handleTemplateSelectChange(e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        {DEFAULT_POLICY_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {selectedTemplate.description}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {contentSource === "template_plus" && selectedTemplate ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Template preview (included in saved policy)
                        </p>
                        <pre className="mt-1 max-h-36 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-800 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-200">
                          {getTemplateBody(selectedTemplate.id, activeLocale)}
                        </pre>
                      </div>
                      <div>
                        {/* Per-locale "additional terms" — same locale tab strip
                      drives both this and the main content textarea. */}
                        <div
                          className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700"
                          role="tablist"
                          aria-label="Additional terms locale"
                        >
                          {POLICY_TRANSLATION_LOCALES.map((l) => {
                            const filled =
                              typeof additionalTermsByLocale[l.value] ===
                                "string" &&
                              additionalTermsByLocale[l.value]!.trim().length >
                                0;
                            const isActive = activeLocale === l.value;
                            return (
                              <button
                                key={l.value}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveLocale(l.value)}
                                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                                  isActive
                                    ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                }`}
                              >
                                <span
                                  aria-hidden
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    filled
                                      ? "bg-emerald-500"
                                      : "bg-gray-300 dark:bg-gray-600"
                                  }`}
                                />
                                {l.label}
                              </button>
                            );
                          })}
                        </div>
                        <label
                          htmlFor="policy-additional"
                          className="mt-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Your additional terms —{" "}
                          {POLICY_TRANSLATION_LOCALES.find(
                            (l) => l.value === activeLocale,
                          )?.label ?? activeLocale}
                        </label>
                        <textarea
                          id="policy-additional"
                          value={additionalTermsByLocale[activeLocale] ?? ""}
                          onChange={(e) =>
                            setAdditionalTermsByLocale((prev) => ({
                              ...prev,
                              [activeLocale]: e.target.value,
                            }))
                          }
                          placeholder="Add clauses specific to this category (plain text)..."
                          className="focus:border-brand-500 focus:ring-brand-500/20 mt-1 min-h-[120px] w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  ) : null}

                  {(contentSource === "template" ||
                    contentSource === "custom") && (
                    <div className="min-h-0 flex-1">
                      {/* Locale tab strip — switching tabs swaps the textarea below.
                    The bullet on each tab indicates whether that locale has
                    any non-empty content authored. */}
                      <div
                        className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700"
                        role="tablist"
                        aria-label="Translation locale"
                      >
                        {POLICY_TRANSLATION_LOCALES.map((l) => {
                          const filled =
                            typeof translations[l.value] === "string" &&
                            translations[l.value]!.trim().length > 0;
                          const isActive = activeLocale === l.value;
                          return (
                            <button
                              key={l.value}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              onClick={() => setActiveLocale(l.value)}
                              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                                isActive
                                  ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                              }`}
                            >
                              <span
                                aria-hidden
                                className={`h-1.5 w-1.5 rounded-full ${
                                  filled
                                    ? "bg-emerald-500"
                                    : "bg-gray-300 dark:bg-gray-600"
                                }`}
                              />
                              {l.label}
                              {primaryLocale === l.value ? (
                                <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ml-1 rounded px-1 py-0.5 text-[10px] font-medium">
                                  primary
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Primary-locale picker — D2 default in POLICY_MULTILANG_PLAN.md.
                    Customer-side renderer falls back to this locale when the
                    user's locale isn't translated. */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>Primary locale:</span>
                        <select
                          value={primaryLocale}
                          onChange={(e) => setPrimaryLocale(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                        >
                          {POLICY_TRANSLATION_LOCALES.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-400">
                          — used as the fallback when a user&apos;s locale has
                          no translation.
                        </span>
                      </div>

                      <label
                        htmlFor="policy-content"
                        className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {contentSource === "template"
                          ? "Template text (editable)"
                          : "Content"}
                        {" — "}
                        <span className="text-gray-500">
                          {POLICY_TRANSLATION_LOCALES.find(
                            (l) => l.value === activeLocale,
                          )?.label ?? activeLocale}
                        </span>
                      </label>
                      <textarea
                        id="policy-content"
                        value={translations[activeLocale] ?? ""}
                        onChange={(e) =>
                          setTranslations((prev) => ({
                            ...prev,
                            [activeLocale]: e.target.value,
                          }))
                        }
                        placeholder={
                          activeLocale === "th"
                            ? "ป้อนข้อกำหนดและเงื่อนไข (ข้อความล้วน)..."
                            : "Enter terms and conditions (plain text)..."
                        }
                        className="focus:border-brand-500 focus:ring-brand-500/20 mt-1 min-h-[200px] w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <p
                          className={
                            activeLocaleLength > POLICY_MAX_LENGTH
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          {
                            POLICY_TRANSLATION_LOCALES.find(
                              (l) => l.value === activeLocale,
                            )?.label
                          }
                          : {activeLocaleLength} / {POLICY_MAX_LENGTH}{" "}
                          characters
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Total across all locales: {totalLength}
                        </p>
                      </div>
                      {!hasAnyTranslation ? (
                        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          At least one non-empty translation is required to
                          save.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            {policyModalTab === "banner" ? (
              <>
                <Button variant="outline" onClick={closeModal}>
                  Close
                </Button>
                {/* Phase 3A.2 — Save also available on banner tab so admins
                    editing only banner text don't have to switch to Terms.
                    Same handleSave gates apply (asNonEmptyParsed picks up
                    whichever block has content). */}
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || isOverLength || !hasUnsavedChanges}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : confirmClear ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Clear all content?
                </span>
                <Button
                  variant="outline"
                  onClick={() => setConfirmClear(false)}
                >
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
                  disabled={!hasSavedContent && !hasAnyTranslation}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Clear T&amp;C
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    isOverLength ||
                    !hasAnyTranslation ||
                    !hasUnsavedChanges
                  }
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
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
              <PrimaryButton variant="blue">Create New</PrimaryButton>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
            {loadingCategories || loadingPolicies ? (
              <div className="flex items-center justify-center py-8">
                <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Loading...
                </span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                          T&amp;C status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                      {filteredCategories.map((category, index) => {
                        // "T&C status" column — green dot if any non-empty
                        // translation exists on the terms block; grey otherwise.
                        const policy = policiesById[category._id];
                        const termsTranslations =
                          (
                            policy?.terms as
                              | { translations?: Record<string, string> }
                              | undefined
                          )?.translations ?? {};
                        const isSet = Object.values(termsTranslations).some(
                          (t) => typeof t === "string" && t.trim().length > 0,
                        );
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
                            className="focus-visible:ring-brand-500/40 dark:focus-visible:ring-brand-400/40 cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800 dark:focus-visible:ring-offset-gray-900"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <CategoryIcon
                                  name={category.name}
                                  className="h-8 w-8 shrink-0 text-gray-500 dark:text-gray-400"
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {category.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                              <span
                                className={`${SUPPORT_BUTTON_CLASS} pointer-events-none`}
                                aria-hidden
                              >
                                Action
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredCategories.length === 0 && !loadingCategories && (
                  <NoData>No categories found.</NoData>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
