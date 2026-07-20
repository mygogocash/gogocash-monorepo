"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AFFILIATE_NETWORKS } from "@/data/affiliateNetworks";
import { DEEPLINK_STORE_OPTIONS } from "@/data/deeplinkStores";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSystemFeePercent } from "@/hooks/useSystemFeePercent";
import { applyPlatformFee } from "@/lib/commissionFee";
import {
  finalizeProductTypeRows,
  netCommissionFromRaw,
} from "@/lib/productTypeCommission";
import { defaultLookupFromBrandAndCountry } from "@/lib/createBrandLookupSlug";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { isDirty } from "@/lib/isDirty";
import { COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY } from "@/lib/query/offersQueries";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import NoData from "@/components/common/NoData";
import { FormSectionJumpNav } from "@/components/form/FormSectionJumpNav";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { fetcher } from "@/lib/axios/client";
import type { ResCategoryList } from "@/types/category";
import { OfferPolicyModeSwitch } from "./OfferPolicyModeSwitch";
import {
  CUSTOM_POLICY_CATEGORY_ID,
  type OfferPolicyMode,
} from "@/lib/offerPolicyMode";
import {
  policyTermsMapFromCategoryList,
  resolveConfiguredOfferPolicyTerms,
} from "@/lib/offerPolicyTerms";
import {
  DEFAULT_OFFER_DISPLAY_TAGS,
  type OfferDisplayTags,
  type OfferProductTypeEntry,
} from "@/types/api";
import {
  DEFAULT_FLOW_TYPE,
  formatTrackingDays,
  isValidTrackingDayCount,
  MAX_TRACKING_PERIOD_DAYS,
  MIN_TRACKING_PERIOD_DAYS,
  resolveTrackingPeriodPreview,
} from "@/lib/offerTrackingPeriod";

function useObjectPreviewUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

function FieldLabel({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function buildCreateBrandTagPreviewChips(
  tags: OfferDisplayTags,
  feedCategoryLabel: string,
): string[] {
  const chips: string[] = [];
  if (tags.brand_category_enabled) {
    chips.push(
      tags.brand_category_label.trim() ||
        (feedCategoryLabel.trim() ? feedCategoryLabel : "Brand category"),
    );
  }
  if (tags.extra_cashback_tag) chips.push("Extra cashback");
  if (tags.grab_coupon_tag) chips.push("Grab Coupon");
  if (tags.expire_in_days_enabled && tags.expire_in_days != null) {
    chips.push(`Expire in ${tags.expire_in_days} days`);
  }
  return chips;
}

/** Default offer category label until a partner feed assigns another (matches mock create). */
const CREATE_BRAND_INITIAL_CATEGORY = "Shopping";

/**
 * Product-type row plus per-row commission-entry UI state. `entry_mode` and
 * `commission_raw` are editing-only and stripped from the submit payload —
 * the saved row shape stays {name, commission_info, deeplink}.
 */
type CreateBrandProductTypeRow = OfferProductTypeEntry & {
  entry_mode?: "manual" | "auto";
};

const SCROLL_CLASS = "scroll-mt-[4.5rem]";

const CREATE_BRAND_JUMP_LINKS = [
  { id: "create-brand-section-setup", label: "Setup" },
  { id: "create-brand-section-brand", label: "Brand" },
  { id: "create-brand-section-product", label: "Product types" },
  { id: "create-brand-section-offer-copy", label: "Offer copy" },
  { id: "create-brand-section-merch", label: "Tags & feed" },
  { id: "create-brand-section-policy", label: "Policy" },
  { id: "create-brand-section-tracking-period", label: "Cashback tracking period" },
  { id: "create-brand-section-media", label: "Media" },
  { id: "create-brand-section-internal", label: "Internal" },
] as const;

/**
 * Editable-field defaults for a brand-new create form. Used as the baseline for
 * the "disable Save until something changed" guard: Save stays disabled while the
 * current field values still deep-equal this snapshot. `addAnotherCountry` is a
 * save-mode toggle (not brand content), so it is intentionally excluded.
 */
const CREATE_BRAND_INITIAL_SNAPSHOT = {
  brandName: "",
  affiliateNetworkId: "involve_asia",
  deeplinkStoreId: "global",
  trackingLink: "",
  appDeeplink: "",
  countries: "Thailand",
  currency: "THB",
  lookupValue: "",
  syncLookupFromBrandCountry: true,
  description: "",
  disabledOffer: false,
  topBrands: false,
  isGlobal: false,
  commissionEntryMode: "manual" as "manual" | "auto",
  commissionPercentInput: "",
  commissionRawInput: "",
  allProductTypes: true,
  productTypes: [] as CreateBrandProductTypeRow[],
  maxCapInput: "",
  noteToUser: "",
  offerDisplayTags: { ...DEFAULT_OFFER_DISPLAY_TAGS } as OfferDisplayTags,
  policyMode: "template" as OfferPolicyMode,
  policyCategoryId: "",
  templateTerms: "",
  customTerms: "",
  trackingPeriodMode: "auto" as "auto" | "manual",
  trackingDays: null as number | null,
  confirmDays: null as number | null,
  flowType: DEFAULT_FLOW_TYPE as "three_step" | "two_step",
  trackingSubtitle: null as string | null,
  confirmSubtitle: null as string | null,
  hasLogo: false,
  hasBanner: false,
};

const COUNTRY_OPTIONS = [
  { label: "Thailand", value: "Thailand" },
  { label: "Indonesia", value: "Indonesia" },
  { label: "Vietnam", value: "Vietnam" },
  { label: "Philippines", value: "Philippines" },
  { label: "Malaysia", value: "Malaysia" },
  { label: "Singapore", value: "Singapore" },
  { label: "United States of America", value: "United States of America" },
  { label: "United Kingdom", value: "United Kingdom" },
] as const;

export default function CreateBrandForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManageBrands = can("brands:manage");
  // Platform fee % from Fee Structure (falls back to 30 while loading / on error).
  const { feePercent, isFallback: feeIsFallback } = useSystemFeePercent();
  const [brandName, setBrandName] = useState("");
  const [affiliateNetworkId, setAffiliateNetworkId] = useState("involve_asia");
  const [deeplinkStoreId, setDeeplinkStoreId] = useState("global");
  const [trackingLink, setTrackingLink] = useState("");
  const [appDeeplink, setAppDeeplink] = useState("");
  const [countries, setCountries] = useState("Thailand");
  const [currency, setCurrency] = useState("THB");
  const [lookupValue, setLookupValue] = useState("");
  const [syncLookupFromBrandCountry, setSyncLookupFromBrandCountry] =
    useState(true);
  const [description, setDescription] = useState("");
  const [disabledOffer, setDisabledOffer] = useState(false);
  const [topBrands, setTopBrands] = useState(false);
  // Brand visibility: when isGlobal=true the brand is shown to customers in every country;
  // otherwise only customers whose country matches `countries` see it. Global brands fall
  // back to the fixed Thailand variant for users whose country has no dedicated line.
  const [isGlobal, setIsGlobal] = useState(false);
  const [commissionEntryMode, setCommissionEntryMode] = useState<
    "manual" | "auto"
  >("manual");
  const [commissionPercentInput, setCommissionPercentInput] = useState("");
  // Auto mode: raw partner % the admin types; the saved net is derived from it.
  const [commissionRawInput, setCommissionRawInput] = useState("");
  const [allProductTypes, setAllProductTypes] = useState(true);
  const [productTypes, setProductTypes] = useState<CreateBrandProductTypeRow[]>(
    [],
  );
  const [maxCapInput, setMaxCapInput] = useState("");
  const [noteToUser, setNoteToUser] = useState("");
  const [offerDisplayTags, setOfferDisplayTags] = useState<OfferDisplayTags>({
    ...DEFAULT_OFFER_DISPLAY_TAGS,
  });
  const [policyMode, setPolicyMode] = useState<OfferPolicyMode>("template");
  const [policyCategoryId, setPolicyCategoryId] = useState("");
  const [templateTerms, setTemplateTerms] = useState("");
  const [templateTermsTouched, setTemplateTermsTouched] = useState(false);
  const [customTerms, setCustomTerms] = useState("");
  const [trackingPeriodMode, setTrackingPeriodMode] = useState<
    "auto" | "manual"
  >("auto");
  const [trackingDays, setTrackingDays] = useState<number | null>(null);
  const [confirmDays, setConfirmDays] = useState<number | null>(null);
  const [flowType, setFlowType] = useState<"three_step" | "two_step">(
    DEFAULT_FLOW_TYPE,
  );
  const [trackingSubtitle, setTrackingSubtitle] = useState<string | null>(null);
  const [confirmSubtitle, setConfirmSubtitle] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // When true, after a successful save the form keeps the brand-level fields (name, logos,
  // description, availability) but clears the country / tracking inputs so the admin can
  // add another country variant of the same brand without re-entering shared info.
  const [addAnotherCountry, setAddAnotherCountry] = useState(false);

  const resetCountryVariantFields = () => {
    // Country-specific fields — wiped after save when "Add another country" is on.
    // Global brands fall back to the fixed Thailand default, so start there too.
    setCountries("Thailand");
    setCurrency("THB");
    setTrackingLink("");
    setAppDeeplink("");
    setLookupValue("");
    setSyncLookupFromBrandCountry(true);
    setCommissionEntryMode("manual");
    setCommissionPercentInput("");
    setCommissionRawInput("");
    setMaxCapInput("");
    setNoteToUser("");
    setProductTypes([]);
    setAllProductTypes(true);
    setDeeplinkStoreId("global");
    setPolicyMode("template");
    setPolicyCategoryId("");
    setTemplateTerms("");
    setTemplateTermsTouched(false);
    setCustomTerms("");
    setOfferDisplayTags({ ...DEFAULT_OFFER_DISPLAY_TAGS });
    setDisabledOffer(false);
    setTopBrands(false);
    // Brand-level fields kept: brandName, logos, banners, description, isGlobal.
  };
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Drives "disable Save until something changed": dirty the moment any editable
  // field departs from the empty-create baseline, clean again if reverted.
  const formDirty = useMemo(
    () =>
      isDirty(
        {
          brandName,
          affiliateNetworkId,
          deeplinkStoreId,
          trackingLink,
          appDeeplink,
          countries,
          currency,
          lookupValue,
          syncLookupFromBrandCountry,
          description,
          disabledOffer,
          topBrands,
          isGlobal,
          commissionEntryMode,
          commissionPercentInput,
          commissionRawInput,
          allProductTypes,
          productTypes,
          maxCapInput,
          noteToUser,
          offerDisplayTags,
          policyMode,
          policyCategoryId,
          templateTerms,
          customTerms,
          trackingPeriodMode,
          trackingDays,
          confirmDays,
          flowType,
          trackingSubtitle,
          confirmSubtitle,
          hasLogo: logoFile != null,
          hasBanner: bannerFile != null,
        },
        CREATE_BRAND_INITIAL_SNAPSHOT,
      ),
    [
      brandName,
      affiliateNetworkId,
      deeplinkStoreId,
      trackingLink,
      appDeeplink,
      countries,
      currency,
      lookupValue,
      syncLookupFromBrandCountry,
      description,
      disabledOffer,
      topBrands,
      isGlobal,
      commissionEntryMode,
      commissionPercentInput,
      commissionRawInput,
      allProductTypes,
      productTypes,
      maxCapInput,
      noteToUser,
      offerDisplayTags,
      policyMode,
      policyCategoryId,
      templateTerms,
      customTerms,
      trackingPeriodMode,
      trackingDays,
      confirmDays,
      flowType,
      trackingSubtitle,
      confirmSubtitle,
      logoFile,
      bannerFile,
    ],
  );

  // Live "% after fee" preview for the auto two-box; also the net submitted
  // as commission_store when the form saves in auto mode.
  const autoCommissionNet = useMemo(() => {
    const raw = commissionRawInput.trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? applyPlatformFee(n, feePercent) : null;
  }, [commissionRawInput, feePercent]);

  const updateProductTypeRow = (
    index: number,
    patch: Partial<CreateBrandProductTypeRow>,
  ) => {
    setProductTypes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const { data: policyCategories = [], isPending: policyCategoriesPending } =
    useQuery<ResCategoryList[]>({
      queryKey: ["getCategory", "create-brand-policy"],
      queryFn: () => fetcher("/offer/get-category/list"),
      staleTime: 60_000,
    });

  const { data: policiesList = {} } = useQuery<
    unknown,
    Error,
    Record<string, string>
  >({
    queryKey: ["policyList", "create-brand"],
    queryFn: () => fetcher("/policy/category-list"),
    select: policyTermsMapFromCategoryList,
    staleTime: 30_000,
  });

  const categoriesSortedForTags = useMemo(
    () => [...policyCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [policyCategories],
  );

  const categoriesForTagSelect = useMemo(() => {
    const seen = new Set<string>();
    const out: ResCategoryList[] = [];
    for (const c of categoriesSortedForTags) {
      const n = c.name.trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(c);
    }
    return out;
  }, [categoriesSortedForTags]);

  const policyCategoriesSorted = useMemo(
    () => [...policyCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [policyCategories],
  );

  const configuredTemplateTerms = useMemo(
    () =>
      resolveConfiguredOfferPolicyTerms(
        policyCategoryId,
        CREATE_BRAND_INITIAL_CATEGORY,
        policyCategories,
        policiesList,
      ),
    [policyCategoryId, policyCategories, policiesList],
  );
  const effectiveTemplateTerms = templateTermsTouched
    ? templateTerms
    : configuredTemplateTerms;

  const legacyBrandCategoryLabel = useMemo(() => {
    const cur = offerDisplayTags.brand_category_label.trim();
    if (!cur) return null;
    if (categoriesForTagSelect.some((c) => c.name === cur)) return null;
    return cur;
  }, [offerDisplayTags.brand_category_label, categoriesForTagSelect]);

  const offerTagPreviewChips = useMemo(
    () =>
      buildCreateBrandTagPreviewChips(
        offerDisplayTags,
        CREATE_BRAND_INITIAL_CATEGORY,
      ),
    [offerDisplayTags],
  );

  const logoPreview = useObjectPreviewUrl(logoFile);
  const bannerPreview = useObjectPreviewUrl(bannerFile);

  useEffect(() => {
    if (!syncLookupFromBrandCountry) return;
    queueMicrotask(() => {
      setLookupValue(defaultLookupFromBrandAndCountry(brandName, countries));
    });
  }, [syncLookupFromBrandCountry, brandName, countries]);

  const applyLookupDefaultOnce = () => {
    const name = brandName.trim();
    if (!name) {
      toast.error("Enter a brand name first.");
      return;
    }
    setLookupValue(defaultLookupFromBrandAndCountry(brandName, countries));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBrands) return;
    const name = brandName.trim();
    const link = trackingLink.trim();
    if (!name) {
      toast.error("Brand name is required.");
      return;
    }
    if (!link) {
      toast.error("Affiliate tracking URL is required.");
      return;
    }

    const tags = offerDisplayTags;
    if (tags.expire_in_days_enabled) {
      const n = tags.expire_in_days;
      if (n == null || Number.isNaN(n) || n < 1) {
        toast.error(
          'Set a positive number of days for "Expire in X days", or turn that tag off.',
        );
        return;
      }
    }

    let commission_store: number | null = null;
    if (commissionEntryMode === "manual") {
      const cp = commissionPercentInput.trim();
      if (cp) {
        const n = parseFloat(cp);
        if (Number.isNaN(n)) {
          toast.error("Commission % must be a number.");
          return;
        }
        commission_store = n;
      }
    } else {
      // Auto: the admin types the raw partner %; the saved commission is the
      // net after the platform fee (Fee Structure rate).
      const raw = commissionRawInput.trim();
      if (raw) {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          toast.error("Raw commission % must be a number.");
          return;
        }
        commission_store = applyPlatformFee(n, feePercent);
      }
    }

    let max_cap: number | null = null;
    const mc = maxCapInput.trim();
    if (mc) {
      const n = parseFloat(mc);
      if (Number.isNaN(n)) {
        toast.error("Max cap must be a number.");
        return;
      }
      max_cap = n;
    }

    // Auto rows recompute their net from the raw % with the fee that is
    // current NOW — the commission_info baked at typing time may predate the
    // Fee Structure fetch resolving (30% fallback window).
    const productTypeRows = allProductTypes
      ? []
      : finalizeProductTypeRows(productTypes, feePercent);

    const formData = new FormData();
    formData.append("brand_name", name);
    formData.append("affiliate_network_id", affiliateNetworkId);
    formData.append("affiliate_tracking_link", link);
    formData.append("countries", countries);
    formData.append("currency", currency);
    formData.append("deeplink_store_id", deeplinkStoreId);
    formData.append("disabled", String(disabledOffer));
    formData.append("extra_store", String(topBrands));
    formData.append("commission_entry_mode", commissionEntryMode);
    if (commission_store != null) {
      formData.append("commission_store", String(commission_store));
    }
    formData.append("all_product_types", String(allProductTypes));
    formData.append("product_types", JSON.stringify(productTypeRows));
    if (max_cap != null) formData.append("max_cap", String(max_cap));
    formData.append("note_to_user", noteToUser.trim());
    formData.append("offer_display_tags", JSON.stringify(offerDisplayTags));
    formData.append(
      "policy_category_id",
      policyMode === "custom" ? CUSTOM_POLICY_CATEGORY_ID : policyCategoryId,
    );
    formData.append(
      "custom_terms",
      policyMode === "custom" ? customTerms : effectiveTemplateTerms,
    );
    formData.append("is_global", String(isGlobal));
    if (isGlobal) {
      // default_country is only relevant for global brands; sending it for country-specific
      // brands would be misleading (the single-country variant is implicitly the default).
      // The picker was removed (#274) but the field is still sent: the API keeps a
      // denormalized copy on the offer doc (real routing uses Brand.default_country) and
      // BrandService requires it for global brands — Thailand is the fixed fallback.
      formData.append("default_country", "Thailand");
    }

    const desc = description.trim();
    if (desc) formData.append("description", desc);
    const lookup = lookupValue.trim();
    if (lookup) formData.append("lookup_value", lookup);
    const app = appDeeplink.trim();
    if (app) formData.append("app_deeplink", app);
    if (logoFile) formData.append("logo_desktop", logoFile);
    if (bannerFile) formData.append("banner", bannerFile);

    formData.append("tracking_period_mode", trackingPeriodMode);
    if (trackingPeriodMode === "manual") {
      if (
        !isValidTrackingDayCount(trackingDays ?? undefined) ||
        !isValidTrackingDayCount(confirmDays ?? undefined)
      ) {
        toast.error(
          `Enter whole day counts between ${MIN_TRACKING_PERIOD_DAYS} and ${MAX_TRACKING_PERIOD_DAYS} for both windows.`,
        );
        return;
      }
      formData.append("tracking_days", String(trackingDays));
      formData.append("confirm_days", String(confirmDays));
    }
    formData.append("flow_type", flowType);
    formData.append("tracking_subtitle", trackingSubtitle ?? "");
    formData.append("confirm_subtitle", confirmSubtitle ?? "");

    setSubmitting(true);
    try {
      await apiClient.createBrandFromAffiliate(formData);
      void queryClient.invalidateQueries({ queryKey: ["offers", "list"] });
      void queryClient.invalidateQueries({
        queryKey: COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY,
      });
      if (addAnotherCountry) {
        toast.success(
          `${name} (${countries}) saved. Add another country variant.`,
        );
        resetCountryVariantFields();
        // Scroll back to the country select so the admin can immediately fill the next variant.
        if (typeof window !== "undefined") {
          document
            .getElementById("create-brand-country")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        toast.success(`Brand "${name}" created and linked.`);
        router.push("/brands");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Could not create brand."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        Create brand from affiliate
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Register a merchant line using the partner tracking URL, map the
        GoGoCash app tracking link when you have it, and choose the advertiser
        store used in tracking links (same as offer edit / Commission
        Management).
      </p>
      {!canManageBrands ? (
        <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          You do not have permission to create brands. Ask an admin with
          Brands Management access to create or update offers.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-6 max-w-4xl space-y-4">
        <fieldset disabled={!canManageBrands} className="space-y-4 disabled:opacity-60">
        <FormSectionJumpNav
          links={CREATE_BRAND_JUMP_LINKS.filter(
            (link) =>
              link.id !== "create-brand-section-product" || !allProductTypes,
          )}
          ariaLabel="Jump to create brand sections"
          className="border-b border-gray-200/90 pb-3 dark:border-gray-700/90"
        />

        <section
          id="create-brand-section-setup"
          className={`space-y-4 ${SCROLL_CLASS}`}
        >
          <div>
            <label
              htmlFor="create-brand-name"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Brand name <span className="text-red-500">*</span>
            </label>
            <input
              id="create-brand-name"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="e.g. New Partner TH"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="create-brand-network"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Affiliate network <span className="text-red-500">*</span>
            </label>
            <select
              id="create-brand-network"
              value={affiliateNetworkId}
              onChange={(e) => setAffiliateNetworkId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {AFFILIATE_NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="create-brand-store"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Advertiser (tracking link store)
            </label>
            <select
              id="create-brand-store"
              value={deeplinkStoreId}
              onChange={(e) => setDeeplinkStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {DEEPLINK_STORE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="create-brand-tracking"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Affiliate tracking URL <span className="text-red-500">*</span>
            </label>
            <input
              id="create-brand-tracking"
              type="url"
              value={trackingLink}
              onChange={(e) => setTrackingLink(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="https://…"
            />
          </div>
          <div>
            <label
              htmlFor="create-brand-app-deeplink"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              GoGoCash app tracking link
            </label>
            <input
              id="create-brand-app-deeplink"
              type="url"
              value={appDeeplink}
              onChange={(e) => setAppDeeplink(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="https://gogocash.app/open/offer/… (optional)"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              If set, saved as the commission tracking link mapping for this new
              offer (same as editing an offer → Tracking Links).
            </p>
          </div>

          <div className="sm:max-w-xs">
            <label
              htmlFor="create-brand-currency"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Currency
            </label>
            <input
              id="create-brand-currency"
              type="text"
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value.toUpperCase().slice(0, 8))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="THB"
            />
          </div>

          {/* Brand visibility — controls whether this brand is shown to customers in other countries. */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <FieldLabel
              label="Availability"
              description="Country-specific brands are hidden from customers in other countries. Global brands appear worldwide; customers without a dedicated country variant always fall back to the Thailand tracking link."
            />
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/40">
                <input
                  type="radio"
                  name="create-brand-availability"
                  checked={!isGlobal}
                  onChange={() => setIsGlobal(false)}
                  className="text-brand-600 focus:ring-brand-500 mt-0.5 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Country-specific
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Only customers whose country is {countries} will see this
                    brand. Customers in other countries won&apos;t see it on
                    home, search, or category pages.
                  </span>
                </span>
              </label>
              {!isGlobal && (
                <div className="mt-2 ml-7">
                  <label
                    htmlFor="create-brand-country"
                    className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    Country (which country this brand applies to)
                  </label>
                  <select
                    id="create-brand-country"
                    value={countries}
                    onChange={(e) => setCountries(e.target.value)}
                    className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/40">
                <input
                  type="radio"
                  name="create-brand-availability"
                  checked={isGlobal}
                  onChange={() => setIsGlobal(true)}
                  className="text-brand-600 focus:ring-brand-500 mt-0.5 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Global / worldwide
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Every customer sees this brand. Customers from countries
                    without a dedicated variant are routed to the Thailand
                    tracking link (the fixed fallback).
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="create-brand-lookup"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Lookup slug (optional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="create-brand-sync-lookup"
                  className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <input
                    id="create-brand-sync-lookup"
                    type="checkbox"
                    checked={syncLookupFromBrandCountry}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setSyncLookupFromBrandCountry(on);
                      if (on) {
                        setLookupValue(
                          defaultLookupFromBrandAndCountry(
                            brandName,
                            countries,
                          ),
                        );
                      }
                    }}
                    className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                  />
                  <span>Default: brand + country (e.g. apple_th)</span>
                </label>
                <button
                  type="button"
                  onClick={applyLookupDefaultOnce}
                  disabled={syncLookupFromBrandCountry}
                  className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply once
                </button>
              </div>
            </div>
            <input
              id="create-brand-lookup"
              type="text"
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              readOnly={syncLookupFromBrandCountry}
              aria-describedby="create-brand-lookup-hint"
              title={
                syncLookupFromBrandCountry
                  ? "Uncheck “Default: brand + country” to edit manually"
                  : undefined
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 read-only:bg-gray-50 read-only:text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:read-only:bg-gray-800 dark:read-only:text-gray-200"
              placeholder="my_brand_th — used in app open URLs"
            />
            <p
              id="create-brand-lookup-hint"
              className="mt-1 text-xs text-gray-500 dark:text-gray-400"
            >
              With the default option on, the slug stays{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.7rem] dark:bg-gray-800">
                brandname_countrycode
              </code>{" "}
              (lowercase, non-alphanumeric → underscore) and updates when brand
              or country changes.
            </p>
          </div>
        </section>

        <section
          id="create-brand-section-brand"
          className={`space-y-4 ${SCROLL_CLASS}`}
        >
          <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Brand &amp; offer
          </h2>
          <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
            <div className="min-w-0 sm:max-w-md">
              <Switch
                key="create-brand-active"
                label="Active offer"
                defaultChecked={!disabledOffer}
                onChange={(checked) => setDisabledOffer(!checked)}
              />
              <p className="mt-0.5 ml-6 text-xs text-gray-500 dark:text-gray-400">
                Show this offer to users. Turn off to hide it.
              </p>
            </div>
            <div className="min-w-0 sm:max-w-md">
              <Switch
                key="create-brand-top-brands"
                label="Top Brands"
                defaultChecked={topBrands}
                onChange={setTopBrands}
              />
              <p className="mt-0.5 ml-6 text-xs text-gray-500 dark:text-gray-400">
                Highlight this offer in top-brand placements in the app.
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <FieldLabel
              label="Commission (%)"
              description={
                commissionEntryMode === "auto"
                  ? `Auto applying with ${feePercent}% fee: type the raw partner % and the user-facing % (after the ${feePercent}% fee) is computed and saved when you create the brand.`
                  : `Maximum % offered to users. Enter the value already reduced by ${feePercent}% from the affiliate partner rate.`
              }
            />
            {feeIsFallback ? (
              <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                Fee Structure rate unavailable — using the {feePercent}%
                default until it loads.
              </p>
            ) : null}
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant={
                  commissionEntryMode === "manual" ? "primary" : "outline"
                }
                onClick={() => {
                  setCommissionEntryMode("manual");
                  setCommissionRawInput("");
                }}
                className="touch-manipulation"
              >
                Manual
              </Button>
              <Button
                size="sm"
                type="button"
                variant={commissionEntryMode === "auto" ? "primary" : "outline"}
                onClick={() => {
                  setCommissionEntryMode("auto");
                  setCommissionPercentInput("");
                }}
                className="touch-manipulation"
              >
                {`Auto applying with ${feePercent}% fee`}
              </Button>
            </div>
            {commissionEntryMode === "auto" ? (
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Raw %
                  </p>
                  <Input
                    type="text"
                    name="commission_raw"
                    value={commissionRawInput}
                    onChange={(e) => setCommissionRawInput(e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    % after {feePercent}% fee
                  </p>
                  <Input
                    type="text"
                    name="commission_store"
                    value={autoCommissionNet ?? ""}
                    disabled
                    placeholder="—"
                  />
                </div>
              </div>
            ) : (
              <Input
                type="text"
                value={commissionPercentInput}
                onChange={(e) => setCommissionPercentInput(e.target.value)}
                placeholder="e.g. 6"
              />
            )}
            <div className="mt-3">
              <Switch
                key={`create-brand-all-pt-${allProductTypes ? "1" : "0"}`}
                label="All product types"
                defaultChecked={allProductTypes}
                onChange={(on) => {
                  setAllProductTypes(on);
                  // Always-ready frame: entering per-row mode seeds one empty
                  // row so the section never opens empty.
                  if (!on) {
                    setProductTypes((prev) =>
                      prev.length === 0
                        ? [{ name: "", commission_info: "", deeplink: "" }]
                        : prev,
                    );
                  }
                }}
              />
              <p className="mt-0.5 ml-6 text-xs text-gray-500 dark:text-gray-400">
                Use one commission rate and tracking link for all lines. Turn
                off to add per-row names and commission.
              </p>
            </div>
          </div>
        </section>

        <section
          id="create-brand-section-product"
          className={`space-y-4 ${SCROLL_CLASS} ${
            allProductTypes ? "hidden" : ""
          }`}
        >
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Product Type
            </h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  setProductTypes((prev) => [
                    ...prev,
                    { name: "", commission_info: "", deeplink: "" },
                  ])
                }
                disabled={allProductTypes}
                className="min-h-11 w-full touch-manipulation sm:w-auto sm:shrink-0"
              >
                Add
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={!formDirty}
                onClick={() =>
                  toast.success(
                    "Product type rows are included when you click Create brand below.",
                  )
                }
                className="min-h-11 w-full touch-manipulation sm:w-auto sm:shrink-0"
              >
                Save changes
              </Button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {allProductTypes ? (
              "Turn off “All product types” under Commission (%) to add per-line names and commission."
            ) : (
              <>
                Add a row for each product type with its name and commission
                info, then use <span className="font-medium">Create brand</span>{" "}
                below to persist.
              </>
            )}
          </p>
          {!allProductTypes && productTypes.length > 0 ? (
            <ul className="space-y-4">
              {productTypes.map((row, i) => {
                const baseId = `create-brand-pt-${i}`;
                const rowMode = row.entry_mode ?? "manual";
                const rowNet = netCommissionFromRaw(
                  row.commission_raw ?? "",
                  feePercent,
                );
                return (
                  <li
                    key={i}
                    className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3 dark:border-gray-700 dark:bg-gray-800/30"
                  >
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${baseId}-name`}
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Product type name
                      </label>
                      <Input
                        id={`${baseId}-name`}
                        type="text"
                        placeholder="e.g. Electronics"
                        value={row.name}
                        onChange={(e) =>
                          updateProductTypeRow(i, { name: e.target.value })
                        }
                        autoComplete="off"
                        enterKeyHint="next"
                        className="min-h-11 w-full min-w-0 touch-manipulation !text-base sm:!text-sm"
                      />
                    </div>
                    <div className="min-w-0 flex-[2]">
                      <p className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Commission
                      </p>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          variant={rowMode === "manual" ? "primary" : "outline"}
                          onClick={() =>
                            updateProductTypeRow(i, { entry_mode: "manual" })
                          }
                          className="touch-manipulation"
                        >
                          Manual
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant={rowMode === "auto" ? "primary" : "outline"}
                          onClick={() =>
                            // Entering auto drops any stale free text; the net
                            // is re-derived from the raw % as it's typed.
                            updateProductTypeRow(i, {
                              entry_mode: "auto",
                              commission_raw: "",
                              commission_info: "",
                            })
                          }
                          className="touch-manipulation"
                        >
                          {`Auto applying with ${feePercent}% fee`}
                        </Button>
                      </div>
                      {rowMode === "auto" ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Input
                            id={`${baseId}-commission-raw`}
                            type="text"
                            placeholder="Raw %"
                            ariaLabel={`Raw % for row ${i + 1}`}
                            value={row.commission_raw ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              const net = netCommissionFromRaw(v, feePercent);
                              // Saved row shape stays {name, commission_info,
                              // deeplink}: the derived net lands in the
                              // commission_info string as "{net}%".
                              updateProductTypeRow(i, {
                                commission_raw: v,
                                commission_info:
                                  net === "" ? "" : `${net}%`,
                              });
                            }}
                            autoComplete="off"
                            className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                          />
                          <Input
                            id={`${baseId}-commission-net`}
                            type="text"
                            placeholder={`% after ${feePercent}% fee`}
                            ariaLabel={`% after ${feePercent}% fee for row ${i + 1}`}
                            value={rowNet === "" ? "" : `${rowNet}%`}
                            disabled
                            className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                          />
                        </div>
                      ) : (
                        <TextArea
                          id={`${baseId}-commission`}
                          rows={1}
                          placeholder="e.g. 5% on new customers"
                          value={row.commission_info}
                          onChange={(v) =>
                            updateProductTypeRow(i, { commission_info: v })
                          }
                          className="h-11 max-h-11 min-h-11 touch-manipulation resize-none overflow-y-auto !text-base !text-gray-800 placeholder:text-gray-400 sm:!text-sm dark:!text-white/90"
                        />
                      )}
                    </div>
                    <div className="flex shrink-0 sm:items-end sm:pb-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          const next = productTypes.filter((_, j) => j !== i);
                          setProductTypes(next);
                        }}
                        className="min-h-11 w-full touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section
          id="create-brand-section-offer-copy"
          className={`space-y-4 ${SCROLL_CLASS}`}
        >
          <div>
            <FieldLabel
              label="Max cap"
              description={`Maximum cap offered to users. Enter the value already reduced by ${feePercent}% from the affiliate partner cap.`}
            />
            <Input
              type="text"
              value={maxCapInput}
              onChange={(e) => setMaxCapInput(e.target.value)}
              placeholder=""
            />
          </div>

          <div>
            <FieldLabel
              label="Note to user"
              description="Optional message shown to customers in the app for this offer (e.g. promo timing, eligibility). Leave empty to hide."
            />
            <TextArea
              rows={4}
              placeholder="e.g. Bonus cashback until 31 Dec · new users only"
              value={noteToUser}
              onChange={setNoteToUser}
              className="min-h-[5.5rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 sm:!text-sm dark:!text-white/90"
            />
          </div>
        </section>

        <div
          id="create-brand-section-merch"
          className={`border-brand-200/80 bg-brand-50/50 dark:border-brand-800/60 dark:bg-brand-950/25 rounded-xl border border-dashed p-4 ${SCROLL_CLASS}`}
        >
          <h3 className="text-brand-900 dark:text-brand-100 text-sm font-semibold">
            Commission info from partner
          </h3>
          <p className="text-brand-800/80 dark:text-brand-200/80 mt-1 text-xs">
            Structured terms as supplied by the partner or affiliate network.
            This does not change when you edit “Commission (%)” or “Max cap”
            above — partner max cap is separate and read-only here. Values
            appear after the offer is synced with a feed; new brands show
            placeholders until then.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Tracking model
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                CPS
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Min / Max
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                —
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Max cap (partner)
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                —
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Currency (partner)
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                {currency.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Payment terms
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                —
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Validation terms
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                —
              </dd>
            </div>
          </dl>

          <div className="border-brand-200/70 dark:border-brand-800/50 mt-6 border-t pt-5">
            <h3 className="text-brand-900 dark:text-brand-100 text-sm font-semibold">
              Offer tags (merchandising)
            </h3>
            <p className="text-brand-800/80 dark:text-brand-200/80 mt-1 text-xs">
              Optional labels for the offer card in the app: category, promos,
              and expiry messaging. Editable here; unrelated to partner rates
              above.
            </p>
            {offerTagPreviewChips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {offerTagPreviewChips.map((c, i) => (
                  <span
                    key={`create-brand-tag-preview-${i}`}
                    className="text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-brand-800/70 dark:text-brand-200/70 mt-2 text-xs">
                No tags enabled — use the toggles below to show pills in the
                app.
              </p>
            )}

            <div className="mt-4 space-y-5">
              <div>
                <Switch
                  key={`create-brand-odt-brand-${offerDisplayTags.brand_category_enabled}`}
                  label="Brand category"
                  defaultChecked={offerDisplayTags.brand_category_enabled}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({
                      ...prev,
                      brand_category_enabled: e,
                    }))
                  }
                />
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Partner feed category:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {CREATE_BRAND_INITIAL_CATEGORY}
                  </span>
                  . Pick a system category below, or leave “Use partner feed” so
                  the tag uses that value.
                </p>
                {offerDisplayTags.brand_category_enabled ? (
                  <div className="mt-2 ml-6 max-w-xl">
                    <label
                      htmlFor="create-brand-tag-brand-category"
                      className="sr-only"
                    >
                      Brand category tag
                    </label>
                    <select
                      id="create-brand-tag-brand-category"
                      className="shadow-theme-xs w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      value={offerDisplayTags.brand_category_label}
                      onChange={(e) =>
                        setOfferDisplayTags((prev) => ({
                          ...prev,
                          brand_category_label: e.target.value,
                        }))
                      }
                      disabled={policyCategoriesPending}
                    >
                      <option value="">
                        Use partner feed ({CREATE_BRAND_INITIAL_CATEGORY})
                      </option>
                      {legacyBrandCategoryLabel ? (
                        <option value={legacyBrandCategoryLabel}>
                          {legacyBrandCategoryLabel} (not in category list —
                          choose a listed value to replace)
                        </option>
                      ) : null}
                      {categoriesForTagSelect.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {policyCategoriesPending ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Loading categories…
                      </p>
                    ) : categoriesForTagSelect.length === 0 ? (
                      <NoData className="mt-1">
                        No categories in the system yet. Add them under Category
                        Management, or use partner feed.
                      </NoData>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <Switch
                  key={`create-brand-odt-xc-${offerDisplayTags.extra_cashback_tag}`}
                  label="Extra cashback"
                  defaultChecked={offerDisplayTags.extra_cashback_tag}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({
                      ...prev,
                      extra_cashback_tag: e,
                    }))
                  }
                />
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Show an “extra cashback” style promo tag (separate from Upsize
                  in the offer editor).
                </p>
              </div>

              <div>
                <Switch
                  key={`create-brand-odt-grab-${offerDisplayTags.grab_coupon_tag}`}
                  label="Grab Coupon"
                  defaultChecked={offerDisplayTags.grab_coupon_tag}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({
                      ...prev,
                      grab_coupon_tag: e,
                    }))
                  }
                />
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Highlight that users can claim a Grab-related coupon for this
                  offer.
                </p>
              </div>

              <div>
                <Switch
                  key={`create-brand-odt-exp-${offerDisplayTags.expire_in_days_enabled}`}
                  label="Expire in X days"
                  defaultChecked={offerDisplayTags.expire_in_days_enabled}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({
                      ...prev,
                      expire_in_days_enabled: e,
                    }))
                  }
                />
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Shows “Expire in {"{n}"} days” on the card. Set the number
                  when enabled.
                </p>
                {offerDisplayTags.expire_in_days_enabled ? (
                  <div className="mt-2 ml-6 flex max-w-md flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Expire in
                    </span>
                    <Input
                      type="number"
                      name="create-brand-offer-tag-expire-days"
                      min="1"
                      className="w-24"
                      value={
                        offerDisplayTags.expire_in_days == null
                          ? ""
                          : String(offerDisplayTags.expire_in_days)
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setOfferDisplayTags((prev) => ({
                          ...prev,
                          expire_in_days: v === "" ? null : Number(v),
                        }));
                      }}
                      autoComplete="off"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      days
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section
          id="create-brand-section-policy"
          className={`space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40 ${SCROLL_CLASS}`}
        >
          <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Terms &amp; conditions (policy)
          </h2>
          <OfferPolicyModeSwitch
            aria-label="Policy authoring mode"
            templateLabel="Provided Template"
            customLabel="Custom Writing"
            mode={policyMode}
            onChange={setPolicyMode}
          />

          {policyMode === "template" ? (
            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-600">
              <FieldLabel
                label="Which category policy applies"
                description="Pick the category whose terms you configured under Policy Management. “Automatic” uses this offer’s own category label."
              />
              <select
                id="create-brand-policy-category"
                className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={policyCategoryId}
                onChange={(e) => {
                  const nextCategoryId = e.target.value;
                  setPolicyCategoryId(nextCategoryId);
                  setTemplateTermsTouched(false);
                  setTemplateTerms(
                    resolveConfiguredOfferPolicyTerms(
                      nextCategoryId,
                      CREATE_BRAND_INITIAL_CATEGORY,
                      policyCategories,
                      policiesList,
                    ),
                  );
                }}
              >
                <option value="">
                  Automatic — use offer category ({CREATE_BRAND_INITIAL_CATEGORY})
                </option>
                {policyCategoriesSorted.map((cat) => {
                  const hasPolicy = Boolean(policiesList[cat._id]?.trim());
                  return (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                      {hasPolicy ? " — T&C configured" : " — no T&C yet"}
                    </option>
                  );
                })}
              </select>

              {!configuredTemplateTerms ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  No T&amp;C configured for this category yet — edit it under
                  Policy Management, or switch to Custom Writing.
                </p>
              ) : (
                <div>
                  <FieldLabel
                    label="Template preview (editable)"
                    description="Review the provided policy and adjust it for this brand before saving."
                  />
                  <TextArea
                    rows={8}
                    value={effectiveTemplateTerms}
                    onChange={(terms) => {
                      setTemplateTermsTouched(true);
                      setTemplateTerms(terms);
                    }}
                    className="min-h-[10rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 sm:!text-sm dark:!text-white/90"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-600">
              <FieldLabel
                label="Custom terms"
                description="Write the complete Terms & Conditions shown for this brand."
              />
              <TextArea
                rows={8}
                placeholder="Write the complete Terms & Conditions for this brand…"
                value={customTerms}
                onChange={setCustomTerms}
                className="min-h-[10rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 sm:!text-sm dark:!text-white/90"
              />
            </div>
          )}
        </section>

        <section
          id="create-brand-section-tracking-period"
          className={`space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40 ${SCROLL_CLASS}`}
        >
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Cashback tracking period
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              The Purchase → Tracking → Confirm steps customers see on this
              brand&apos;s shop page.{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Auto
              </span>{" "}
              follows the affiliate partner&apos;s validation terms;{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Manual
              </span>{" "}
              sets the windows for this brand.
            </p>
          </div>

          {(() => {
            const preview = resolveTrackingPeriodPreview({
              tracking_period_mode: trackingPeriodMode,
              tracking_days: trackingDays,
              confirm_days: confirmDays,
              flow_type: flowType,
              tracking_subtitle: trackingSubtitle,
              confirm_subtitle: confirmSubtitle,
            });
            const sourceLabel =
              preview.source === "manual"
                ? "Manual — set for this brand"
                : preview.source === "partner"
                  ? "Auto — from partner validation terms"
                  : "Auto — platform default (no partner terms on file)";
            return (
              <>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Purchase
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                      with GoGoCash
                    </dd>
                  </div>
                  {preview.flow_type === "two_step" ? (
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Tracking and confirm
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                        {formatTrackingDays(preview.confirm_days)}
                      </dd>
                      <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {preview.confirm_subtitle}
                      </dd>
                    </div>
                  ) : (
                    <>
                      <div>
                        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Tracking
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                          {formatTrackingDays(preview.tracking_days)}
                        </dd>
                        <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {preview.tracking_subtitle}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Confirm
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                          {formatTrackingDays(preview.confirm_days)}
                        </dd>
                        <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {preview.confirm_subtitle}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sourceLabel}
                </p>
              </>
            );
          })()}

          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="radio"
                  name="create-brand-tracking-period-mode"
                  className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  checked={trackingPeriodMode === "auto"}
                  onChange={() => setTrackingPeriodMode("auto")}
                />
                Auto — fetch from affiliate partner
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="radio"
                  name="create-brand-tracking-period-mode"
                  className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  checked={trackingPeriodMode === "manual"}
                  onChange={() => setTrackingPeriodMode("manual")}
                />
                Manual
              </label>
            </div>
            <Switch
              label="Combined 2-step flow (Tracking and confirm)"
              checked={flowType === "two_step"}
              onChange={(checked) =>
                setFlowType(checked ? "two_step" : "three_step")
              }
            />
            {trackingPeriodMode === "manual" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Tracking window (days)
                  </label>
                  <input
                    type="number"
                    min={MIN_TRACKING_PERIOD_DAYS}
                    max={MAX_TRACKING_PERIOD_DAYS}
                    value={trackingDays ?? ""}
                    onChange={(e) =>
                      setTrackingDays(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Confirm window (days)
                  </label>
                  <input
                    type="number"
                    min={MIN_TRACKING_PERIOD_DAYS}
                    max={MAX_TRACKING_PERIOD_DAYS}
                    value={confirmDays ?? ""}
                    onChange={(e) =>
                      setConfirmDays(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Tracking subtitle
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="from the following month"
                  value={trackingSubtitle ?? ""}
                  onChange={(e) =>
                    setTrackingSubtitle(e.target.value || null)
                  }
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Confirm subtitle
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="after validation"
                  value={confirmSubtitle ?? ""}
                  onChange={(e) =>
                    setConfirmSubtitle(e.target.value || null)
                  }
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Logos & media — same structure as FormOffer `offer-section-media` */}
        <section
          id="create-brand-section-media"
          className={`space-y-4 ${SCROLL_CLASS}`}
        >
          <h4 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Logos &amp; media
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload one square logo and one wide banner. Each asset is reused by
            desktop, mobile, and legacy customer surfaces.
          </p>

          <div>
            <FieldLabel
              label="Brand logo"
              description="Square (1:1) image used anywhere the brand logo appears."
            />
            <Input
              id="create-brand-logo"
              type="file"
              name="logo_desktop"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
            {logoFile && logoPreview ? (
              <RemoteOrBlobImage
                src={logoPreview}
                alt="Brand logo preview"
                width={256}
                height={256}
                className="mt-2 h-32 w-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            ) : null}
          </div>

          <div>
            <FieldLabel
              label="Brand banner"
              description="Wide (16:9) hero image used on the brand page."
            />
            <Input
              id="create-brand-banner"
              type="file"
              name="banner"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
            />
            {bannerFile && bannerPreview ? (
              <RemoteOrBlobImage
                src={bannerPreview}
                alt="Brand banner preview"
                width={800}
                height={450}
                className="mt-2 aspect-video h-auto w-[320px] max-w-full rounded-lg border border-gray-200 object-cover dark:border-gray-600"
              />
            ) : null}
          </div>
        </section>

        <section
          id="create-brand-section-internal"
          className={`space-y-4 ${SCROLL_CLASS}`}
        >
          <div>
            <label
              htmlFor="create-brand-desc"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Internal description (optional)
            </label>
            <textarea
              id="create-brand-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </section>
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <label
            htmlFor="create-brand-add-another"
            className="mr-auto flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            title="After saving, keep brand-level fields (name, logo, availability) and clear the country/tracking inputs so you can add another country variant of this brand quickly."
          >
            <input
              id="create-brand-add-another"
              type="checkbox"
              checked={addAnotherCountry}
              onChange={(e) => setAddAnotherCountry(e.target.checked)}
              className="text-brand-600 focus:ring-brand-500 mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-900"
            />
            <span>
              <span className="font-medium">
                Save and add another country variant
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Keeps brand fields, clears the country / tracking inputs.
              </span>
            </span>
          </label>
          <Link
            href="/brands"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !formDirty || !canManageBrands}
            className="bg-brand-500 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-full px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting
              ? "Creating…"
              : addAnotherCountry
                ? "Save & add another"
                : "Create brand"}
          </button>
        </div>
      </form>
    </div>
  );
}
