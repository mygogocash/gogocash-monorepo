"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import client, { fetcher } from "@/lib/axios/client";
import { ResCategoryList } from "@/types/category";
import NoData from "@/components/common/NoData";
import Button from "@/components/ui/button/Button";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { PencilIcon } from "@/icons";
import CategoryIcon, {
  CATEGORY_ICON_KEYS,
  resolveCategoryIconKey,
  type CategoryIconKey,
} from "./CategoryIcon";
import { isDirty } from "@/lib/isDirty";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  buildPolicyAggregateFormData,
  newPolicyRequestKey,
  policyAggregateSignature,
} from "@/lib/policyAggregateCommand";
import { pathImage } from "@/utils/helper";
import { validateCategoryName } from "./categoryNameValidation";
import toast from "react-hot-toast";
import {
  DEFAULT_POLICY_TEMPLATES,
  NEW_CATEGORY_BANNER_REQUIRED_MESSAGE,
  NEW_POLICY_TERMS_REQUIRED_MESSAGE,
  POLICY_TRANSLATION_LOCALES,
  asNonEmptyParsed,
  buildUnifiedPolicySavePlan,
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

type PolicyLifecycleAction = "delete-content" | "retire";

type PolicyReferenceCounts = {
  offer_policy_category_id: number;
  offer_categories_normalized: number;
  unique_offers: number;
};

type PolicyLifecycleDialogState = {
  action: PolicyLifecycleAction;
  category: ResCategoryList;
  requestKey: string;
  errorMessage: string | null;
  referenceCounts: PolicyReferenceCounts | null;
  revisionConflict: boolean;
};

type PolicyLifecycleResponse = {
  request_key?: string;
  operation?: PolicyLifecycleAction;
  category?: ResCategoryList;
};

type PolicyLifecycleErrorBody = {
  code?: unknown;
  reference_counts?: Partial<Record<keyof PolicyReferenceCounts, unknown>>;
};

const POLICY_REFERENCE_COUNT_KEYS = [
  "offer_policy_category_id",
  "offer_categories_normalized",
  "unique_offers",
] as const;

function newPolicyLifecycleRequestKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `policy-lifecycle-${uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function lifecycleErrorBody(error: unknown): PolicyLifecycleErrorBody {
  if (!error || typeof error !== "object") return {};
  if ("response" in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    if (response?.data && typeof response.data === "object") {
      return response.data as PolicyLifecycleErrorBody;
    }
  }
  if ("data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object") {
      return data as PolicyLifecycleErrorBody;
    }
  }
  return error as PolicyLifecycleErrorBody;
}

function lifecycleReferenceCounts(
  body: PolicyLifecycleErrorBody,
): PolicyReferenceCounts | null {
  const counts = body.reference_counts;
  if (!counts) return null;
  const values = POLICY_REFERENCE_COUNT_KEYS.map((key) => counts[key]);
  if (
    values.some(
      (value) =>
        typeof value !== "number" || !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    return null;
  }
  return {
    offer_policy_category_id: values[0] as number,
    offer_categories_normalized: values[1] as number,
    unique_offers: values[2] as number,
  };
}

type PolicyBannerTextEditorConfig = {
  translations: Record<string, string>;
  setTranslations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  primaryLocale: string;
  setPrimaryLocale: (v: string) => void;
  activeLocale: string;
  setActiveLocale: (v: string) => void;
  editing: boolean;
  onBeginEdit: () => void;
  onCancel: () => void;
  editAriaLabel: string;
  saving: boolean;
  required?: boolean;
};

type TermsEditSnapshot = {
  translations: Record<string, string>;
  additionalTermsByLocale: Record<string, string>;
  primaryLocale: string;
  selectedTemplateId: string;
  contentSource: ContentSource;
};

type BannerEditSnapshot = {
  bannerTranslations: Record<string, string>;
  bannerPrimaryLocale: string;
  defaultBannerFile: File | null;
};

function emptyTermsEditSnapshot(): TermsEditSnapshot {
  return {
    translations: {},
    additionalTermsByLocale: {},
    primaryLocale: "th",
    selectedTemplateId: "",
    contentSource: "custom",
  };
}

function emptyBannerEditSnapshot(): BannerEditSnapshot {
  return {
    bannerTranslations: {},
    bannerPrimaryLocale: "th",
    defaultBannerFile: null,
  };
}

function renderPolicyLocalePreview(
  byLocale: Record<string, string>,
  primary: string,
  emptyHint: string,
) {
  const populated = POLICY_TRANSLATION_LOCALES.filter(
    (l) =>
      typeof byLocale[l.value] === "string" &&
      byLocale[l.value]!.trim().length > 0,
  );
  if (populated.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/30 dark:text-gray-400">
        {emptyHint}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {populated.map((l) => (
        <div key={l.value}>
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {l.label}
            {l.value === primary ? " (primary)" : null}
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
            {byLocale[l.value]}
          </div>
        </div>
      ))}
    </div>
  );
}

function PolicyBannerTextEditor(cfg: PolicyBannerTextEditorConfig) {
  return (
    <div className="mt-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Banner text (per locale)
            {cfg.required ? (
              <span className="ml-1 text-red-600" aria-hidden="true">
                *
              </span>
            ) : null}
          </h4>
          {cfg.editing ? (
            <button
              type="button"
              onClick={cfg.onCancel}
              disabled={cfg.saving}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel banner text changes
            </button>
          ) : (
            <SecondaryButton
              type="button"
              onClick={cfg.onBeginEdit}
              aria-label={cfg.editAriaLabel}
            >
              Edit
            </SecondaryButton>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Optional short caption rendered above the offer grid on the customer
          side. Up to 500 characters per locale.
        </p>
        {cfg.required &&
        !Object.values(cfg.translations).some(
          (value) => typeof value === "string" && value.trim().length > 0,
        ) ? (
          <p
            className="mt-2 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            {NEW_CATEGORY_BANNER_REQUIRED_MESSAGE}
          </p>
        ) : null}

        {!cfg.editing ? (
          renderPolicyLocalePreview(
            cfg.translations,
            cfg.primaryLocale,
            "No banner text set yet — click Edit to add.",
          )
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>Primary locale:</span>
              <select
                value={cfg.primaryLocale}
                onChange={(e) => cfg.setPrimaryLocale(e.target.value)}
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
                  typeof cfg.translations[l.value] === "string" &&
                  cfg.translations[l.value]!.trim().length > 0;
                const isActive = cfg.activeLocale === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => cfg.setActiveLocale(l.value)}
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
                    {cfg.primaryLocale === l.value ? (
                      <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ml-1 rounded px-1 py-0.5 text-[10px] font-medium">
                        primary
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <textarea
              aria-label="Policy banner text"
              value={cfg.translations[cfg.activeLocale] ?? ""}
              onChange={(e) =>
                cfg.setTranslations((prev) => ({
                  ...prev,
                  [cfg.activeLocale]: e.target.value,
                }))
              }
              maxLength={500}
              placeholder={
                cfg.activeLocale === "th"
                  ? "เช่น โปรโมชั่นพิเศษเดือนนี้ — รับแคชแบ็กเพิ่ม 5%..."
                  : "e.g. Special promotion this month — extra 5% cashback..."
              }
              className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 min-h-[80px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {
                POLICY_TRANSLATION_LOCALES.find(
                  (l) => l.value === cfg.activeLocale,
                )?.label
              }
              : {(cfg.translations[cfg.activeLocale] ?? "").length} / 500
              characters
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PolicyTable() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] =
    useState<ResCategoryList | null>(null);
  const [contentSource, setContentSource] = useState<ContentSource>("custom");
  // "" = no template chosen yet (the "— Select a template —" placeholder).
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  // "Create New" opens a local draft. The category does not exist until the
  // admin supplies a valid unique name and explicitly saves it.
  const [creatingCategoryDraft, setCreatingCategoryDraft] = useState(false);
  // Inline category-name rename (the pencil next to the editor title).
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("default");
  const aggregateRequest = useRef<{
    signature: string;
    requestKey: string;
  } | null>(null);
  const [lifecycleDialog, setLifecycleDialog] =
    useState<PolicyLifecycleDialogState | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const lifecycleBusyRef = useRef(false);
  const lifecycleDialogRef = useRef<HTMLDivElement>(null);
  const lifecycleConfirmRef = useRef<HTMLButtonElement>(null);
  const lifecycleReturnFocusRef = useRef<HTMLElement | null>(null);

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
  const [saving, setSaving] = useState(false);
  // Per-section view/edit toggle (read-only preview by default; Edit reveals the
  // form, mirroring the offer card's policy section). Snapshots captured on
  // entering edit mode let Cancel revert that section's in-progress changes.
  const [editingTerms, setEditingTerms] = useState(false);
  const [editingBanner, setEditingBanner] = useState(false);
  const termsEditSnapshot = useRef<TermsEditSnapshot>(emptyTermsEditSnapshot());
  const bannerEditSnapshot = useRef<BannerEditSnapshot>(
    emptyBannerEditSnapshot(),
  );
  // Uploaded banner per section (object-URL preview + filename). Replaces the
  // preset preview once a file is chosen via "Upload File".
  const [defaultUpload, setDefaultUpload] = useState<{
    file: File;
    url: string;
    name: string;
  } | null>(null);
  const defaultFileRef = useRef<HTMLInputElement>(null);

  // Object URLs only exist for local preview. The selected File stays in the
  // draft and is uploaded by the same editor-level Save as the text blocks.
  useEffect(() => {
    if (!defaultUpload) return undefined;
    return () => URL.revokeObjectURL(defaultUpload.url);
  }, [defaultUpload]);

  // Snapshot of the editable fields `handleSave` sends, captured the moment a
  // category modal opens (i.e. AFTER the loaded policy populates state). Drives
  // "disable Save until something changed". The image File is tracked
  // separately because deep-comparing browser File objects is not meaningful.
  type SaveSnapshot = {
    categoryName: string;
    iconKey: CategoryIconKey;
    primaryLocale: string;
    translations: Record<string, string>;
    contentSource: ContentSource;
    selectedTemplateId: string;
    additionalTermsByLocale: Record<string, string>;
    bannerPrimaryLocale: string;
    bannerTranslations: Record<string, string>;
  };
  const [saveBaseline, setSaveBaseline] = useState<SaveSnapshot | null>(null);
  const currentSaveSnapshot: SaveSnapshot = {
    categoryName: nameDraft,
    iconKey,
    primaryLocale,
    translations,
    contentSource,
    selectedTemplateId,
    additionalTermsByLocale,
    bannerPrimaryLocale,
    bannerTranslations,
  };
  // Per-block dirty flags let the unified Save send only the blocks that
  // changed, so editing one section never overwrites the other.
  const baseline = saveBaseline;
  const categoryDirty = isDirty(
    { categoryName: nameDraft, iconKey },
    baseline && {
      categoryName: baseline.categoryName,
      iconKey: baseline.iconKey,
    },
  );
  const termsDirty = isDirty(
    {
      primaryLocale,
      translations,
      contentSource,
      selectedTemplateId,
      additionalTermsByLocale,
    },
    baseline && {
      primaryLocale: baseline.primaryLocale,
      translations: baseline.translations,
      contentSource: baseline.contentSource,
      selectedTemplateId: baseline.selectedTemplateId,
      additionalTermsByLocale: baseline.additionalTermsByLocale,
    },
  );
  const bannerDirty = isDirty(
    { bannerPrimaryLocale, bannerTranslations },
    baseline && {
      bannerPrimaryLocale: baseline.bannerPrimaryLocale,
      bannerTranslations: baseline.bannerTranslations,
    },
  );

  const { data: categories = [], isLoading: loadingCategories } = useQuery<
    ResCategoryList[]
  >({
    queryKey: ["getCategory", "policy-page"],
    queryFn: () => fetcher("/offer/get-category/list"),
    staleTime: 60_000,
  });
  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          !category.lifecycle_status || category.lifecycle_status === "active",
      ),
    [categories],
  );

  const { normalizedName, error: categoryNameError } = useMemo(
    () =>
      validateCategoryName(nameDraft, activeCategories, selectedCategory?._id),
    [nameDraft, activeCategories, selectedCategory?._id],
  );

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
  const isNewPolicy =
    creatingCategoryDraft ||
    Boolean(selectedCategory && !policiesById[selectedCategory._id]);
  const hasUnsavedChanges =
    creatingCategoryDraft ||
    categoryDirty ||
    termsDirty ||
    bannerDirty ||
    defaultUpload !== null;
  const defaultBannerSrc = defaultUpload?.url
    ? defaultUpload.url
    : selectedCategory?.banner
      ? pathImage(selectedCategory.banner, "banner")
      : "";

  // Category-table toolbar — free-text search by name + filter by T&C status.
  const [categorySearch, setCategorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "set" | "unset">(
    "all",
  );
  const isCategorySet = useCallback(
    (category: ResCategoryList) => {
      const policy = policiesById[category._id];
      const termsTranslations =
        (policy?.terms as { translations?: Record<string, string> } | undefined)
          ?.translations ?? {};
      return Object.values(termsTranslations).some(
        (t) => typeof t === "string" && t.trim().length > 0,
      );
    },
    [policiesById],
  );
  const displayedCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    let list = q
      ? activeCategories.filter((c) => c.name.toLowerCase().includes(q))
      : activeCategories;
    if (statusFilter === "set") list = list.filter((c) => isCategorySet(c));
    else if (statusFilter === "unset")
      list = list.filter((c) => !isCategorySet(c));
    return list;
  }, [activeCategories, categorySearch, statusFilter, isCategorySet]);

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
      const hasTerms = Boolean(asNonEmptyParsed(parsed));
      const hasBannerText = Boolean(asNonEmptyParsed(bannerParsed));
      setCreatingCategoryDraft(false);
      setSelectedCategory(category);
      setNameDraft(category.name);
      const nextIconKey = resolveCategoryIconKey(
        category.icon_key,
        category.name,
      );
      setIconKey(nextIconKey);
      setContentSource(parsed.contentSource ?? "custom");
      setSelectedTemplateId(parsed.templateId ?? "");
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
      setDefaultUpload(null);
      // Empty blocks are creation work, so expose their editors immediately.
      // Populated blocks stay in review mode until the admin explicitly edits.
      setEditingTerms(!hasTerms);
      setEditingBanner(!hasBannerText);
      setEditingName(false);
      termsEditSnapshot.current = {
        translations: { ...parsed.translations },
        additionalTermsByLocale: { ...parsed.additionalTerms },
        primaryLocale: parsed.primary_locale || "th",
        selectedTemplateId: parsed.templateId ?? "",
        contentSource: parsed.contentSource ?? "custom",
      };
      bannerEditSnapshot.current = {
        bannerTranslations: { ...bannerParsed.translations },
        bannerPrimaryLocale: bannerParsed.primary_locale || "th",
        defaultBannerFile: null,
      };
      // Baseline for "disable Save until changed". Built from the same parsed
      // values used in the setters above (state updates are async, so we can't
      // read them back here). Mirrors `currentSaveSnapshot` exactly.
      const nextContentSource = parsed.contentSource ?? "custom";
      setSaveBaseline({
        categoryName: category.name,
        iconKey: nextIconKey,
        primaryLocale: parsed.primary_locale || "th",
        translations: { ...parsed.translations },
        contentSource: nextContentSource,
        selectedTemplateId: parsed.templateId ?? "",
        additionalTermsByLocale: { ...parsed.additionalTerms },
        bannerPrimaryLocale: bannerParsed.primary_locale || "th",
        bannerTranslations: { ...bannerParsed.translations },
      });
    },
    [policiesById],
  );

  const closeModal = useCallback(() => {
    setCreatingCategoryDraft(false);
    setSelectedCategory(null);
    setSaveBaseline(null);
    setTranslations({});
    setAdditionalTermsByLocale({});
    setContentSource("custom");
    setSelectedTemplateId("");
    setPrimaryLocale("th");
    setActiveLocale("th");
    setBannerPrimaryLocale("th");
    setBannerTranslations({});
    setBannerActiveLocale("th");
    setDefaultUpload(null);
    setEditingTerms(false);
    setEditingBanner(false);
    termsEditSnapshot.current = emptyTermsEditSnapshot();
    bannerEditSnapshot.current = emptyBannerEditSnapshot();
    setEditingName(false);
    setNameDraft("");
    setIconKey("default");
    aggregateRequest.current = null;
  }, []);

  const handleCreateCategory = () => {
    closeModal();
    setCreatingCategoryDraft(true);
    setNameDraft("");
    setIconKey("default");
    setEditingName(true);
    setEditingTerms(true);
    setEditingBanner(true);
    // New sections begin editing immediately, so restate their explicit empty
    // Cancel baselines after the general modal reset. Each section can then
    // discard only its own local draft.
    termsEditSnapshot.current = emptyTermsEditSnapshot();
    bannerEditSnapshot.current = emptyBannerEditSnapshot();
    setSaveBaseline({
      categoryName: "",
      iconKey: "default",
      primaryLocale: "th",
      translations: {},
      contentSource: "custom",
      selectedTemplateId: "",
      additionalTermsByLocale: {},
      bannerPrimaryLocale: "th",
      bannerTranslations: {},
    });
  };
  // Inline rename of the open category (the pencil next to the title).
  const beginEditName = () => {
    setNameDraft(selectedCategory?.name ?? "");
    setEditingName(true);
  };
  const cancelEditName = () => {
    if (creatingCategoryDraft) {
      closeModal();
      return;
    }
    setNameDraft(selectedCategory?.name ?? "");
    setEditingName(false);
  };

  // "Upload File" keeps both the real File and an object-URL preview in the
  // local draft. Nothing is persisted until the unified Save succeeds.
  const handleDefaultUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDefaultUpload({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    });
  };

  // Remove only the selected draft; an already-saved banner remains untouched.
  const handleRemoveDefault = () => {
    setDefaultUpload(null);
    if (defaultFileRef.current) defaultFileRef.current.value = "";
  };

  // Templates apply to the ACTIVE locale only — admins translate per-locale,
  // not by retemplating every locale at once. If you want all locales to use
  // the same template, switch tabs and re-apply.
  const handleTemplateSelectChange = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = getTemplateById(id);
    if (!tmpl) return;
    // Single editable content box — load the chosen template into it for the
    // active locale so the admin can edit / extend it before saving.
    setTranslations((prev) => ({
      ...prev,
      [activeLocale]: getTemplateBody(tmpl.id, activeLocale),
    }));
  };

  // One editor-level Save coordinates policy text and the optional category
  // banner File. Existing policy writes remain patch-like (dirty blocks only),
  // while the first policy write must include non-empty terms.
  const handleSave = async () => {
    if (!selectedCategory && !creatingCategoryDraft) return;
    if (categoryNameError) {
      setEditingName(true);
      toast.error(categoryNameError);
      return;
    }
    if ((isNewPolicy || termsDirty) && isOverLength) {
      toast.error("One or more translations exceed 50,000 characters.");
      return;
    }
    const termsParsed = asNonEmptyParsed({
      primary_locale: primaryLocale,
      translations,
      contentSource,
      templateId:
        contentSource === "template" || contentSource === "template_plus"
          ? selectedTemplateId || null
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
    const savePlan = buildUnifiedPolicySavePlan({
      categoryId: selectedCategory?._id ?? "__new__",
      isNewPolicy,
      requireBannerText: creatingCategoryDraft,
      termsDirty,
      bannerDirty,
      termsParsed,
      bannerParsed,
    });
    if (!savePlan.ok) {
      if (savePlan.message === NEW_CATEGORY_BANNER_REQUIRED_MESSAGE) {
        setEditingBanner(true);
      } else {
        setEditingTerms(true);
      }
      toast.error(savePlan.message);
      return;
    }

    setSaving(true);
    try {
      const aggregateInput = {
        categoryId: selectedCategory?._id,
        categoryName: normalizedName,
        iconKey,
        policy: savePlan.payload,
        defaultBanner: defaultUpload?.file ?? null,
      };
      const signature = await policyAggregateSignature(aggregateInput);
      const requestKey =
        aggregateRequest.current?.signature === signature
          ? aggregateRequest.current.requestKey
          : newPolicyRequestKey();
      aggregateRequest.current = { signature, requestKey };
      const aggregateForm = buildPolicyAggregateFormData({
        ...aggregateInput,
        requestKey,
      });
      const response = await client.put("/policy/aggregate", aggregateForm);
      const responseBody = response.data as {
        category?: ResCategoryList;
        data?: { category?: ResCategoryList };
      };
      const savedCategory =
        responseBody.data?.category ?? responseBody.category;
      if (!savedCategory?._id) {
        throw new Error("Policy save completed without category data.");
      }
      // The key belongs to this one committed command. Failed attempts retain
      // it for retry; a later save, even with identical-looking input, must
      // start a fresh command rather than replay this committed response.
      aggregateRequest.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["policyList"] }),
        queryClient.invalidateQueries({
          queryKey: ["getCategory", "policy-page"],
        }),
      ]);

      setSelectedCategory(savedCategory);
      setCreatingCategoryDraft(false);
      setNameDraft(savedCategory.name);
      setIconKey(
        resolveCategoryIconKey(savedCategory.icon_key, savedCategory.name),
      );
      setSaveBaseline({
        ...currentSaveSnapshot,
        categoryName: savedCategory.name,
        iconKey: resolveCategoryIconKey(
          savedCategory.icon_key,
          savedCategory.name,
        ),
        translations: { ...translations },
        additionalTermsByLocale: { ...additionalTermsByLocale },
        bannerTranslations: { ...bannerTranslations },
      });
      termsEditSnapshot.current = {
        translations: { ...translations },
        additionalTermsByLocale: { ...additionalTermsByLocale },
        primaryLocale,
        selectedTemplateId,
        contentSource,
      };
      bannerEditSnapshot.current = {
        bannerTranslations: { ...bannerTranslations },
        bannerPrimaryLocale,
        defaultBannerFile: null,
      };
      setEditingTerms(false);
      setEditingBanner(false);
      setEditingName(false);
      setDefaultUpload(null);
      if (defaultFileRef.current) defaultFileRef.current.value = "";
      toast.success(
        defaultUpload
          ? "Policy and default banner saved."
          : "Policy changes saved.",
      );
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          "Couldn't save the policy. Your draft is still here—retry, or contact an administrator if it continues.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // Clear is a draft action. The unified payload turns an emptied existing
  // block into explicit `clear_terms`, so Save cannot silently ignore it.
  const handleClearClick = () => {
    setTranslations({});
    setAdditionalTermsByLocale({});
    toast.success(
      isNewPolicy
        ? "Terms draft cleared. Add required terms before saving."
        : "Terms will be removed when you save changes.",
    );
  };

  // Enter edit mode: snapshot the section's editable fields (spread-copied so
  // later edits don't mutate the snapshot) so Cancel can revert them.
  const beginEditTerms = () => {
    termsEditSnapshot.current = {
      translations: { ...translations },
      additionalTermsByLocale: { ...additionalTermsByLocale },
      primaryLocale,
      selectedTemplateId,
      contentSource,
    };
    setEditingTerms(true);
  };
  const cancelEditTerms = () => {
    const s = termsEditSnapshot.current;
    setTranslations({ ...s.translations });
    setAdditionalTermsByLocale({ ...s.additionalTermsByLocale });
    setPrimaryLocale(s.primaryLocale);
    setSelectedTemplateId(s.selectedTemplateId);
    setContentSource(s.contentSource);
    setEditingTerms(false);
  };
  const beginEditBanner = () => {
    bannerEditSnapshot.current = {
      bannerTranslations: { ...bannerTranslations },
      bannerPrimaryLocale,
      defaultBannerFile: defaultUpload?.file ?? null,
    };
    setEditingBanner(true);
  };
  const cancelEditBanner = () => {
    const s = bannerEditSnapshot.current;
    setBannerTranslations({ ...s.bannerTranslations });
    setBannerPrimaryLocale(s.bannerPrimaryLocale);
    const previousFile = s.defaultBannerFile;
    setDefaultUpload(
      previousFile
        ? {
            file: previousFile,
            url: URL.createObjectURL(previousFile),
            name: previousFile.name,
          }
        : null,
    );
    if (defaultFileRef.current) defaultFileRef.current.value = "";
    setEditingBanner(false);
  };

  const openLifecycleDialog = (
    event: React.MouseEvent<HTMLButtonElement>,
    category: ResCategoryList,
    action: PolicyLifecycleAction,
  ) => {
    event.stopPropagation();
    lifecycleReturnFocusRef.current = event.currentTarget;
    const revisionAvailable =
      typeof category.revision === "number" &&
      Number.isSafeInteger(category.revision) &&
      category.revision >= 0;
    setLifecycleDialog({
      action,
      category,
      requestKey: newPolicyLifecycleRequestKey(),
      errorMessage: revisionAvailable
        ? null
        : "Category version is unavailable. Reload category data before retrying this action.",
      referenceCounts: null,
      revisionConflict: !revisionAvailable,
    });
  };

  const closeLifecycleDialog = () => {
    if (lifecycleBusyRef.current) return;
    setLifecycleDialog(null);
  };

  const refreshPolicyData = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["policyList"] }),
        queryClient.invalidateQueries({
          queryKey: ["getCategory", "policy-page"],
        }),
      ]),
    [queryClient],
  );

  const submitLifecycleAction = async () => {
    const command = lifecycleDialog;
    if (!command || lifecycleBusyRef.current || command.revisionConflict) {
      return;
    }
    const expectedRevision = command.category.revision;
    if (
      typeof expectedRevision !== "number" ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    ) {
      setLifecycleDialog((current) =>
        current
          ? {
              ...current,
              errorMessage:
                "Category version is unavailable. Reload category data before retrying this action.",
              revisionConflict: true,
            }
          : current,
      );
      return;
    }

    lifecycleBusyRef.current = true;
    setLifecycleBusy(true);
    setLifecycleDialog((current) =>
      current
        ? {
            ...current,
            errorMessage: null,
            referenceCounts: null,
            revisionConflict: false,
          }
        : current,
    );

    try {
      const response = await client.post(
        `/policy/category/${command.category._id}/${command.action}`,
        {
          request_key: command.requestKey,
          expected_revision: expectedRevision,
        },
      );
      const body = response.data as PolicyLifecycleResponse;
      const returnedCategory = body?.category;
      const expectedLifecycle =
        command.action === "retire" ? "retired" : "active";
      if (
        body?.request_key !== command.requestKey ||
        body?.operation !== command.action ||
        returnedCategory?._id !== command.category._id ||
        returnedCategory.lifecycle_status !== expectedLifecycle ||
        typeof returnedCategory.revision !== "number" ||
        !Number.isSafeInteger(returnedCategory.revision) ||
        returnedCategory.revision <= expectedRevision
      ) {
        throw new Error(
          "The server did not return authoritative category lifecycle data. Reload category data before retrying.",
        );
      }

      queryClient.setQueryData<ResCategoryList[]>(
        ["getCategory", "policy-page"],
        (current) =>
          current?.map((category) =>
            category._id === returnedCategory._id
              ? { ...category, ...returnedCategory }
              : category,
          ),
      );
      await refreshPolicyData();

      lifecycleBusyRef.current = false;
      setLifecycleBusy(false);
      setLifecycleDialog(null);
      toast.success(
        command.action === "retire"
          ? `${returnedCategory.name} was retired.`
          : `Policy content for ${returnedCategory.name} was deleted.`,
      );
    } catch (error: unknown) {
      const body = lifecycleErrorBody(error);
      const revisionConflict =
        body.code === "POLICY_CATEGORY_REVISION_CONFLICT";
      const referenceCounts =
        body.code === "POLICY_CATEGORY_REFERENCED"
          ? lifecycleReferenceCounts(body)
          : null;
      const apiMessage = getApiErrorMessage(
        error,
        command.action === "retire"
          ? "Couldn't retire the category. Please try again."
          : "Couldn't delete the policy content. Please try again.",
      );
      setLifecycleDialog((current) =>
        current?.requestKey === command.requestKey
          ? {
              ...current,
              errorMessage: revisionConflict
                ? `${apiMessage} Reload category data before retrying this action.`
                : apiMessage,
              referenceCounts,
              revisionConflict,
            }
          : current,
      );
      lifecycleBusyRef.current = false;
      setLifecycleBusy(false);
    }
  };

  const reloadLifecycleData = async () => {
    if (lifecycleBusyRef.current) return;
    lifecycleBusyRef.current = true;
    setLifecycleBusy(true);
    try {
      await refreshPolicyData();
      setLifecycleDialog(null);
    } finally {
      lifecycleBusyRef.current = false;
      setLifecycleBusy(false);
    }
  };

  const lifecycleDialogOpen = lifecycleDialog !== null;
  useEffect(() => {
    if (!lifecycleDialogOpen) return undefined;
    const returnFocus = lifecycleReturnFocusRef.current;
    const focusTimer = window.setTimeout(() => {
      lifecycleConfirmRef.current?.focus();
    }, 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !lifecycleBusyRef.current) {
        event.preventDefault();
        setLifecycleDialog(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", closeOnEscape);
      returnFocus?.focus();
    };
  }, [lifecycleDialogOpen]);

  useEffect(() => {
    if (lifecycleDialog?.revisionConflict) {
      lifecycleConfirmRef.current?.focus();
    }
  }, [lifecycleDialog?.revisionConflict]);

  const trapLifecycleDialogFocus = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      lifecycleDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {selectedCategory || creatingCategoryDraft ? (
        <div className="flex flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {editingName ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !categoryNameError)
                          setEditingName(false);
                        if (e.key === "Escape") cancelEditName();
                      }}
                      aria-label="Category name"
                      aria-invalid={Boolean(categoryNameError)}
                      aria-describedby="category-name-error"
                      autoFocus
                      className="focus:border-brand-400 focus:ring-brand-500/20 h-9 min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-xl font-semibold text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      disabled={saving || Boolean(categoryNameError)}
                      className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditName}
                      disabled={saving}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                  {categoryNameError ? (
                    <p
                      id="category-name-error"
                      role="alert"
                      className="mt-1 text-xs text-red-600 dark:text-red-400"
                    >
                      {categoryNameError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {nameDraft || "New category"}
                  </h3>
                  <button
                    type="button"
                    aria-label="Edit category"
                    onClick={beginEditName}
                    className="shrink-0 text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <PencilIcon className="h-4 w-4" viewBox="0 0 21 21" />
                  </button>
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {creatingCategoryDraft
                  ? "Enter a unique category name. Nothing is saved until you save the full draft."
                  : "Edit the terms & conditions and the category banner for this category. Optional admin translation is stored with the policy."}
              </p>
              <label className="mt-3 block max-w-xs text-xs font-medium text-gray-600 dark:text-gray-300">
                Category icon
                <select
                  aria-label="Category icon"
                  value={iconKey}
                  onChange={(event) =>
                    setIconKey(event.target.value as CategoryIconKey)
                  }
                  disabled={saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {CATEGORY_ICON_KEYS.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] font-normal text-gray-500 dark:text-gray-400">
                  Choose from the built-in icon set. New icons are added by
                  engineering, not uploaded here.
                </span>
              </label>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={
                  saving ||
                  Boolean(categoryNameError) ||
                  ((isNewPolicy || termsDirty) && isOverLength) ||
                  !hasUnsavedChanges
                }
                className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                Close
              </Button>
            </div>
          </div>

          {selectedCategory || creatingCategoryDraft ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  Terms &amp; conditions (per locale)
                  {isNewPolicy ? (
                    <span className="ml-1 text-red-600" aria-hidden="true">
                      *
                    </span>
                  ) : null}
                </h4>
                {!editingTerms ? (
                  <SecondaryButton
                    type="button"
                    onClick={beginEditTerms}
                    aria-label="Edit terms & conditions"
                  >
                    Edit
                  </SecondaryButton>
                ) : null}
              </div>
              {isNewPolicy && !hasAnyTranslation ? (
                <p
                  className="mt-2 text-xs text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {NEW_POLICY_TERMS_REQUIRED_MESSAGE}
                </p>
              ) : null}
              {!editingTerms ? (
                <div className="mt-4">
                  {renderPolicyLocalePreview(
                    translations,
                    primaryLocale,
                    "No terms set yet — click Edit to add.",
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Optional starting template — pick one to load it into the
                      content box below, or leave it on "— Select a template —"
                      to write your own from scratch. */}
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
                      <option value="">— Select a template —</option>
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

                  <div className="min-h-0 flex-1">
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
                        — used as the fallback when a user&apos;s locale has no
                        translation.
                      </span>
                    </div>

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

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="policy-content"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                      {/* Clear and Cancel stay scoped; the header owns Save. */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleClearClick}
                          disabled={!hasAnyTranslation}
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Clear T&amp;C
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditTerms}
                          disabled={saving}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Cancel terms changes
                        </button>
                      </div>
                    </div>
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
                        : {activeLocaleLength} / {POLICY_MAX_LENGTH} characters
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Total across all locales: {totalLength}
                      </p>
                    </div>
                    {!hasAnyTranslation && !isNewPolicy ? (
                      <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        Saving will remove the terms block from this existing
                        policy.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
                <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900/20">
                  {/* Default banner — preset preview, replaced by an uploaded file. */}
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          Default banner
                        </h3>
                        {defaultBannerSrc ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-green-500"
                              aria-hidden
                            />
                            {defaultUpload
                              ? "Unsaved replacement"
                              : "Active banner"}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
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
                    {defaultBannerSrc ? (
                      <RemoteOrBlobImage
                        className="max-h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                        src={defaultBannerSrc}
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
                      aria-label="Default banner file"
                      accept="image/*"
                      onChange={handleDefaultUpload}
                      className="hidden"
                    />

                    <PolicyBannerTextEditor
                      translations={bannerTranslations}
                      setTranslations={setBannerTranslations}
                      primaryLocale={bannerPrimaryLocale}
                      setPrimaryLocale={setBannerPrimaryLocale}
                      activeLocale={bannerActiveLocale}
                      setActiveLocale={setBannerActiveLocale}
                      editing={editingBanner}
                      onBeginEdit={beginEditBanner}
                      onCancel={cancelEditBanner}
                      editAriaLabel="Edit banner text"
                      saving={saving}
                      required={creatingCategoryDraft}
                    />
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Terms &amp; conditions by category
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Total: {displayedCategories.length} categories
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PrimaryButton variant="blue" onClick={handleCreateCategory}>
                Create New
              </PrimaryButton>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search category…"
                aria-label="Search categories"
                className="focus:border-brand-300 focus:ring-brand-500/10 h-9 w-[280px] max-w-full min-w-[200px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-500 placeholder:text-gray-400 focus:ring-3 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:placeholder:text-gray-500"
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "set" | "unset")
                }
                aria-label="Filter by T&C status"
                className="h-9 min-w-[150px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400"
              >
                <option value="all">All statuses (default)</option>
                <option value="set">Already set</option>
                <option value="unset">Not set yet</option>
              </select>
            </div>
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
                      {displayedCategories.map((category, index) => {
                        // "T&C status" — green when any locale has terms content.
                        const isSet = isCategorySet(category);
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
                                  iconKey={category.icon_key}
                                  className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500"
                                  strokeWidth={0.75}
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
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={`Edit ${category.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openModal(category);
                                  }}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  className={SUPPORT_BUTTON_CLASS}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete policy content for ${category.name}`}
                                  onClick={(event) =>
                                    openLifecycleDialog(
                                      event,
                                      category,
                                      "delete-content",
                                    )
                                  }
                                  onKeyDown={(event) => event.stopPropagation()}
                                  className="inline-flex h-7 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-xs text-amber-700 hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:border-amber-700 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                                >
                                  Delete content
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Retire ${category.name}`}
                                  onClick={(event) =>
                                    openLifecycleDialog(
                                      event,
                                      category,
                                      "retire",
                                    )
                                  }
                                  onKeyDown={(event) => event.stopPropagation()}
                                  className="inline-flex h-7 items-center justify-center rounded-lg border border-red-300 bg-white px-3 text-xs text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:border-red-700 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/30"
                                >
                                  Retire
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {displayedCategories.length === 0 && !loadingCategories && (
                  <NoData>No categories found.</NoData>
                )}
              </>
            )}
          </div>
        </>
      )}
      {lifecycleDialog ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !lifecycleBusyRef.current
            ) {
              closeLifecycleDialog();
            }
          }}
        >
          <div
            ref={lifecycleDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-lifecycle-dialog-title"
            aria-describedby="policy-lifecycle-dialog-description"
            onKeyDown={trapLifecycleDialogFocus}
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <h2
              id="policy-lifecycle-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {lifecycleDialog.action === "retire"
                ? "Retire category?"
                : "Delete policy content?"}
            </h2>
            <div
              id="policy-lifecycle-dialog-description"
              className="mt-3 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
            >
              {lifecycleDialog.action === "retire" ? (
                <>
                  <p>
                    Retiring <strong>{lifecycleDialog.category.name}</strong>{" "}
                    hides it from this Policy page, from category selection in
                    offer editing, and from the app&apos;s category list. Its
                    name stays reserved and cannot be reused for a new
                    category.
                  </p>
                  {/* The 30-day window mirrors CATEGORY_RETENTION_MS in
                      apps/api/src/policy/category-integrity.service.ts. */}
                  <p>
                    Nothing is deleted: the category and its policy content are
                    kept for 30 days, after which only a superadmin can
                    permanently purge them. Retiring cannot be undone from the
                    admin panel.
                  </p>
                  <p>
                    You can only retire a category that no offers use. The
                    server re-checks every offer reference when you confirm; if
                    any remain, the change is blocked and the references are
                    shown here.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This deletes the saved policy terms, localized banner text,
                    and default policy media for{" "}
                    <strong>{lifecycleDialog.category.name}</strong>.
                  </p>
                  <p>
                    The category remains active and available to offers. Its
                    name and selected category icon are preserved.
                  </p>
                </>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Category version:{" "}
                {typeof lifecycleDialog.category.revision === "number"
                  ? lifecycleDialog.category.revision
                  : "unavailable"}{" "}
                — if this category changes before you confirm, you will be
                asked to reload.
              </p>
            </div>

            {lifecycleDialog.errorMessage ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
              >
                <p>{lifecycleDialog.errorMessage}</p>
                {lifecycleDialog.referenceCounts ? (
                  <div className="mt-3">
                    <p className="font-semibold">
                      Retirement is blocked by these server references:
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-xs">
                      {POLICY_REFERENCE_COUNT_KEYS.map((key) => (
                        <li key={key}>
                          {key}: {lifecycleDialog.referenceCounts?.[key]}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 font-sans text-sm">
                      Remove every offer reference, reload category data, and
                      try again.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeLifecycleDialog}
                disabled={lifecycleBusy}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              {lifecycleDialog.revisionConflict ? (
                <button
                  ref={lifecycleConfirmRef}
                  type="button"
                  onClick={() => void reloadLifecycleData()}
                  disabled={lifecycleBusy}
                  className="bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-400 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lifecycleBusy ? "Reloading…" : "Reload category data"}
                </button>
              ) : (
                <button
                  ref={lifecycleConfirmRef}
                  type="button"
                  onClick={() => void submitLifecycleAction()}
                  disabled={lifecycleBusy}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lifecycleBusy
                    ? lifecycleDialog.action === "retire"
                      ? "Retiring…"
                      : "Deleting…"
                    : lifecycleDialog.action === "retire"
                      ? "Retire category"
                      : "Delete content"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
