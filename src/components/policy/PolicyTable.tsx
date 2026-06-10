"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher, fetcherPut } from "@/lib/axios/client";
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
  const [selectedCategory, setSelectedCategory] =
    useState<ResCategoryList | null>(null);
  const [contentSource, setContentSource] = useState<ContentSource>("custom");
  // "" = no template chosen yet (the "— Select a template —" placeholder).
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

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
  const termsEditSnapshot = useRef<{
    translations: Record<string, string>;
    additionalTermsByLocale: Record<string, string>;
    primaryLocale: string;
    selectedTemplateId: string;
    contentSource: ContentSource;
  } | null>(null);
  const bannerEditSnapshot = useRef<{
    bannerTranslations: Record<string, string>;
    bannerPrimaryLocale: string;
  } | null>(null);
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
  // Auto-save on upload — which banner is briefly "Saving…" (transient).
  const [bannerSaving, setBannerSaving] = useState<
    "default" | "special" | null
  >(null);
  const bannerSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // Per-block dirty flags — each section's Save is gated on its OWN changes, so
  // saving (or re-baselining) one section never enables/touches the other.
  const baseline = initialSaveSnapshot.current;
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

  // Category-table toolbar — free-text search by name + sort by T&C status.
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySort, setCategorySort] = useState<"default" | "set" | "unset">(
    "default",
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
    const list = q
      ? categories.filter((c) => c.name.toLowerCase().includes(q))
      : categories;
    if (categorySort === "default") return list;
    // "set" floats Set rows up, "unset" floats them down.
    return [...list].sort((a, b) => {
      const av = isCategorySet(a) ? 1 : 0;
      const bv = isCategorySet(b) ? 1 : 0;
      return categorySort === "set" ? bv - av : av - bv;
    });
  }, [categories, categorySearch, categorySort, isCategorySet]);

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
      setSpecialUpload(null);
      setSpecialEventStartDate("");
      setSpecialEventStartTime("");
      setSpecialEventEndDate("");
      setSpecialEventEndTime("");
      setEditingTerms(false);
      setEditingBanner(false);
      setPolicyModalTab("terms");
      // Baseline for "disable Save until changed". Built from the same parsed
      // values used in the setters above (state updates are async, so we can't
      // read them back here). Mirrors `currentSaveSnapshot` exactly.
      const nextContentSource = parsed.contentSource ?? "custom";
      initialSaveSnapshot.current = {
        primaryLocale: parsed.primary_locale || "th",
        translations: { ...parsed.translations },
        contentSource: nextContentSource,
        selectedTemplateId: parsed.templateId ?? "",
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
    setContentSource("custom");
    setSelectedTemplateId("");
    setPrimaryLocale("th");
    setActiveLocale("th");
    setBannerPrimaryLocale("th");
    setBannerTranslations({});
    setBannerActiveLocale("th");
    setEditingTerms(false);
    setEditingBanner(false);
    setPolicyModalTab("terms");
  }, []);

  // Auto-save a just-uploaded banner — no separate Save step. Mock: a brief
  // "Saving…" then a confirmation toast (object-URL preview is applied at once).
  const autoSaveBanner = (which: "default" | "special", name: string) => {
    if (bannerSaveTimeout.current) clearTimeout(bannerSaveTimeout.current);
    setBannerSaving(which);
    bannerSaveTimeout.current = setTimeout(() => {
      setBannerSaving(null);
      toast.success(`${name} saved automatically.`);
    }, 600);
  };

  // "Upload File" handlers — read the chosen image into an object-URL preview
  // (revoking any prior one), then auto-save. Data is mock, so it's client-side.
  const handleDefaultUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (defaultUpload) URL.revokeObjectURL(defaultUpload.url);
    setDefaultUpload({ url: URL.createObjectURL(file), name: file.name });
    autoSaveBanner("default", file.name);
  };

  const handleSpecialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (specialUpload) URL.revokeObjectURL(specialUpload.url);
    setSpecialUpload({ url: URL.createObjectURL(file), name: file.name });
    autoSaveBanner("special", file.name);
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

  // "Set" — validate the special-event start/end window (date + 24h time).
  const handleSetSchedule = () => {
    if (
      !specialEventStartDate ||
      !specialEventStartTime ||
      !specialEventEndDate ||
      !specialEventEndTime
    ) {
      toast.error("Set a start and end date and time (24h).");
      return;
    }
    const toMs = (date: string, time: string) => {
      const [h = "0", m = "0"] = time.split(":");
      return new Date(
        `${date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`,
      ).getTime();
    };
    if (
      !(
        toMs(specialEventEndDate, specialEventEndTime) >
        toMs(specialEventStartDate, specialEventStartTime)
      )
    ) {
      toast.error("The special event must end after it starts.");
      return;
    }
    toast.success(
      `Schedule set: ${specialEventStartDate} ${specialEventStartTime} → ${specialEventEndDate} ${specialEventEndTime}.`,
    );
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

  // Persist ONE block (terms or banner). The other block is intentionally
  // omitted from the payload so the server keeps its copy — this is what makes
  // each section's "read-only preview" promise true (editing/saving one section
  // never rewrites the other). On success the editor stays open and `afterSave`
  // returns that section to its preview (defaults to closing the editor).
  const handleSave = async (
    block: "terms" | "banner",
    afterSave?: () => void,
  ) => {
    if (!selectedCategory) return;
    if (block === "terms" && isOverLength) {
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
    const editedParsed = block === "terms" ? termsParsed : bannerParsed;
    if (!editedParsed) {
      toast.error(
        block === "terms"
          ? "Add at least one terms translation before saving."
          : "Add banner text in at least one locale before saving.",
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
            termsParsed: block === "terms" ? termsParsed : undefined,
            bannerParsed: block === "banner" ? bannerParsed : undefined,
          }),
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["policyList"] });
      // Re-baseline ONLY the saved block so its dirty flag resets while the
      // other block's unsaved edits (it wasn't persisted) stay flagged dirty.
      initialSaveSnapshot.current = {
        ...(initialSaveSnapshot.current ?? currentSaveSnapshot),
        ...(block === "terms"
          ? {
              primaryLocale,
              translations: { ...translations },
              contentSource,
              selectedTemplateId,
              additionalTermsByLocale: { ...additionalTermsByLocale },
            }
          : {
              bannerPrimaryLocale,
              bannerTranslations: { ...bannerTranslations },
            }),
      };
      toast.success(
        block === "terms" ? "Terms & conditions saved." : "Banner text saved.",
      );
      (afterSave ?? closeModal)();
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

  // One-step clear — empty the terms content for every locale. Local only;
  // closing without saving leaves any previously-saved policy intact.
  const handleClearClick = () => {
    setTranslations({});
    setAdditionalTermsByLocale({});
    toast.success("Terms content cleared.");
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
    if (s) {
      setTranslations(s.translations);
      setAdditionalTermsByLocale(s.additionalTermsByLocale);
      setPrimaryLocale(s.primaryLocale);
      setSelectedTemplateId(s.selectedTemplateId);
      setContentSource(s.contentSource);
    }
    setEditingTerms(false);
  };
  const beginEditBanner = () => {
    bannerEditSnapshot.current = {
      bannerTranslations: { ...bannerTranslations },
      bannerPrimaryLocale,
    };
    setEditingBanner(true);
  };
  const cancelEditBanner = () => {
    const s = bannerEditSnapshot.current;
    if (s) {
      setBannerTranslations(s.bannerTranslations);
      setBannerPrimaryLocale(s.bannerPrimaryLocale);
    }
    setEditingBanner(false);
  };

  // Read-only preview shown when a section isn't being edited — every locale
  // that has content, each in its own bordered box (primary flagged). Reads the
  // live per-section state, which equals the saved value outside edit mode.
  const renderLocalePreview = (
    byLocale: Record<string, string>,
    primary: string,
    emptyHint: string,
  ) => {
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
  };

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
                  : "Pick an optional starting template, then edit the terms text per locale. Optional admin translation is stored with the policy."}
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
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex items-center gap-3">
                      {bannerSaving === "default" ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Saving…
                        </span>
                      ) : null}
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
                </div>

                {/* Special event banner — replaces the default for a set period. */}
                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                    <div className="flex items-center gap-3">
                      {bannerSaving === "special" ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Saving…
                        </span>
                      ) : null}
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
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <div className="min-w-[180px] flex-1">
                      <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Starts
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
                    <div className="min-w-[180px] flex-1">
                      <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Ends
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
                    <PrimaryButton variant="blue" onClick={handleSetSchedule}>
                      Set
                    </PrimaryButton>
                  </div>
                </div>

                {/* Phase 3A.2 — banner text editor (per-locale, ≤500 chars).
                  Saved on the same "Save" action as the Terms tab — both
                  blocks share the modal's Save button. */}
                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Banner text (per locale)
                    </h4>
                    {editingBanner ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={cancelEditBanner}
                          disabled={saving}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleSave("banner", () =>
                              setEditingBanner(false),
                            )
                          }
                          disabled={saving || !bannerDirty}
                          className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    ) : (
                      <SecondaryButton
                        type="button"
                        onClick={beginEditBanner}
                        aria-label="Edit banner text"
                      >
                        Edit
                      </SecondaryButton>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Optional short caption rendered above the offer grid on the
                    customer side. Up to 500 characters per locale.
                  </p>

                  {!editingBanner ? (
                    renderLocalePreview(
                      bannerTranslations,
                      bannerPrimaryLocale,
                      "No banner text set yet — click Edit to add.",
                    )
                  ) : (
                    <>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>Primary locale:</span>
                        <select
                          value={bannerPrimaryLocale}
                          onChange={(e) =>
                            setBannerPrimaryLocale(e.target.value)
                          }
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
                        :{" "}
                        {(bannerTranslations[bannerActiveLocale] ?? "").length}{" "}
                        / 500 characters
                      </p>
                    </>
                  )}
                </div>
              </section>
            ) : null}

            {policyModalTab === "terms" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Terms &amp; conditions (per locale)
                  </h4>
                  {editingTerms ? (
                    <button
                      type="button"
                      onClick={cancelEditTerms}
                      disabled={saving}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  ) : (
                    <SecondaryButton
                      type="button"
                      onClick={beginEditTerms}
                      aria-label="Edit terms & conditions"
                    >
                      Edit
                    </SecondaryButton>
                  )}
                </div>
                {!editingTerms ? (
                  <div className="mt-4">
                    {renderLocalePreview(
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
                          — used as the fallback when a user&apos;s locale has
                          no translation.
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
                        {/* One-click Clear empties the content; Save persists.
                          Right-aligned on the Content label row. */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleClearClick}
                            disabled={!hasAnyTranslation}
                            className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-red-400"
                          >
                            Clear T&amp;C
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleSave("terms", () =>
                                setEditingTerms(false),
                              )
                            }
                            disabled={
                              saving ||
                              isOverLength ||
                              !hasAnyTranslation ||
                              !termsDirty
                            }
                            className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {saving ? "Saving…" : "Save"}
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
                  </div>
                )}
              </>
            ) : null}
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
                Total: {displayedCategories.length} categories
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PrimaryButton variant="blue">Create New</PrimaryButton>
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
                value={categorySort}
                onChange={(e) =>
                  setCategorySort(e.target.value as "default" | "set" | "unset")
                }
                aria-label="Sort by T&C status"
                className="h-9 min-w-[150px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400"
              >
                <option value="default">Sort by…</option>
                <option value="set">Status: Set first</option>
                <option value="unset">Status: Not set first</option>
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

                {displayedCategories.length === 0 && !loadingCategories && (
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
