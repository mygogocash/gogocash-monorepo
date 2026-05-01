"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AFFILIATE_NETWORKS } from "@/data/affiliateNetworks";
import { DEEPLINK_STORE_OPTIONS } from "@/data/deeplinkStores";
import toast from "react-hot-toast";
import { useDataSession } from "@/hooks/useDataSession";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { defaultLookupFromBrandAndCountry } from "@/lib/createBrandLookupSlug";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY } from "@/lib/query/offersQueries";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { FormSectionJumpNav } from "@/components/form/FormSectionJumpNav";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { fetcher } from "@/lib/axios/client";
import type { ResCategoryList } from "@/types/category";
import {
  DEFAULT_OFFER_DISPLAY_TAGS,
  type OfferDisplayTags,
  type OfferProductTypeEntry,
} from "@/types/api";

function useObjectPreviewUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

function FieldLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function buildCreateBrandTagPreviewChips(tags: OfferDisplayTags, feedCategoryLabel: string): string[] {
  const chips: string[] = [];
  if (tags.brand_category_enabled) {
    chips.push(
      tags.brand_category_label.trim() || (feedCategoryLabel.trim() ? feedCategoryLabel : "Brand category"),
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

const SCROLL_CLASS = "scroll-mt-[4.5rem]";

const CREATE_BRAND_JUMP_LINKS = [
  { id: "create-brand-section-setup", label: "Setup" },
  { id: "create-brand-section-brand", label: "Brand" },
  { id: "create-brand-section-product", label: "Product types" },
  { id: "create-brand-section-offer-copy", label: "Offer copy" },
  { id: "create-brand-section-merch", label: "Tags & feed" },
  { id: "create-brand-section-policy", label: "Policy" },
  { id: "create-brand-section-media", label: "Media" },
  { id: "create-brand-section-internal", label: "Internal" },
] as const;

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
  const session = useDataSession();
  const accessToken = session.accessToken ?? DEFAULT_MOCK_ACCESS_TOKEN;

  const [brandName, setBrandName] = useState("");
  const [affiliateNetworkId, setAffiliateNetworkId] = useState("involve_asia");
  const [deeplinkStoreId, setDeeplinkStoreId] = useState("global");
  const [trackingLink, setTrackingLink] = useState("");
  const [appDeeplink, setAppDeeplink] = useState("");
  const [countries, setCountries] = useState("Thailand");
  const [currency, setCurrency] = useState("THB");
  const [lookupValue, setLookupValue] = useState("");
  const [syncLookupFromBrandCountry, setSyncLookupFromBrandCountry] = useState(false);
  const [description, setDescription] = useState("");
  const [disabledOffer, setDisabledOffer] = useState(false);
  const [topBrands, setTopBrands] = useState(false);
  // Brand visibility: when isGlobal=true the brand is shown to customers in every country;
  // otherwise only customers whose country matches `countries` see it. defaultCountry is the
  // fallback variant when a global brand is opened by a user whose country has no dedicated line.
  const [isGlobal, setIsGlobal] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("Thailand");
  const [commissionEntryMode, setCommissionEntryMode] = useState<"manual" | "auto">("manual");
  const [commissionPercentInput, setCommissionPercentInput] = useState("");
  const [allProductTypes, setAllProductTypes] = useState(true);
  const [productTypes, setProductTypes] = useState<OfferProductTypeEntry[]>([]);
  const [maxCapInput, setMaxCapInput] = useState("");
  const [noteToUser, setNoteToUser] = useState("");
  const [offerDisplayTags, setOfferDisplayTags] = useState<OfferDisplayTags>({
    ...DEFAULT_OFFER_DISPLAY_TAGS,
  });
  const [policyCategoryId, setPolicyCategoryId] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoDesktop, setLogoDesktop] = useState<File | null>(null);
  const [logoMobile, setLogoMobile] = useState<File | null>(null);
  const [logoCircle, setLogoCircle] = useState<File | null>(null);
  const [bannerDesktop, setBannerDesktop] = useState<File | null>(null);
  const [bannerMobile, setBannerMobile] = useState<File | null>(null);

  const { data: policyCategories = [], isPending: policyCategoriesPending } = useQuery<ResCategoryList[]>({
    queryKey: ["getCategory", "create-brand-policy"],
    queryFn: () => fetcher("/offer/get-category/list"),
    staleTime: 60_000,
  });

  const { data: policiesList = {} } = useQuery<Record<string, string>>({
    queryKey: ["policyList", "create-brand"],
    queryFn: () => fetcher("/policy/list"),
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

  const legacyBrandCategoryLabel = useMemo(() => {
    const cur = offerDisplayTags.brand_category_label.trim();
    if (!cur) return null;
    if (categoriesForTagSelect.some((c) => c.name === cur)) return null;
    return cur;
  }, [offerDisplayTags.brand_category_label, categoriesForTagSelect]);

  const offerTagPreviewChips = useMemo(
    () => buildCreateBrandTagPreviewChips(offerDisplayTags, CREATE_BRAND_INITIAL_CATEGORY),
    [offerDisplayTags],
  );

  const logoDesktopPreview = useObjectPreviewUrl(logoDesktop);
  const logoMobilePreview = useObjectPreviewUrl(logoMobile);
  const logoCirclePreview = useObjectPreviewUrl(logoCircle);
  const bannerDesktopPreview = useObjectPreviewUrl(bannerDesktop);
  const bannerMobilePreview = useObjectPreviewUrl(bannerMobile);

  useEffect(() => {
    if (!syncLookupFromBrandCountry) return;
    setLookupValue(defaultLookupFromBrandAndCountry(brandName, countries));
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

    const productTypeRows = allProductTypes
      ? []
      : productTypes
          .map((row) => ({
            name: row.name.trim(),
            commission_info: row.commission_info.trim(),
            deeplink: (row.deeplink ?? "").trim(),
          }))
          .filter(
            (row) =>
              row.name.length > 0 ||
              row.commission_info.length > 0 ||
              row.deeplink.length > 0,
          );

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
    if (commissionEntryMode === "manual" && commission_store != null) {
      formData.append("commission_store", String(commission_store));
    }
    formData.append("all_product_types", String(allProductTypes));
    formData.append("product_types", JSON.stringify(productTypeRows));
    if (max_cap != null) formData.append("max_cap", String(max_cap));
    formData.append("note_to_user", noteToUser.trim());
    formData.append("offer_display_tags", JSON.stringify(offerDisplayTags));
    formData.append("policy_category_id", policyCategoryId);
    formData.append("custom_terms", customTerms);
    formData.append("is_global", String(isGlobal));
    if (isGlobal) {
      // default_country is only relevant for global brands; sending it for country-specific
      // brands would be misleading (the single-country variant is implicitly the default).
      formData.append("default_country", defaultCountry);
    }

    const desc = description.trim();
    if (desc) formData.append("description", desc);
    const lookup = lookupValue.trim();
    if (lookup) formData.append("lookup_value", lookup);
    const app = appDeeplink.trim();
    if (app) formData.append("app_deeplink", app);
    if (logoDesktop) formData.append("logo_desktop", logoDesktop);
    if (logoMobile) formData.append("logo_mobile", logoMobile);
    if (logoCircle) formData.append("logo_circle", logoCircle);
    if (bannerDesktop) formData.append("banner", bannerDesktop);
    if (bannerMobile) formData.append("banner_mobile", bannerMobile);

    setSubmitting(true);
    try {
      await apiClient.createBrandFromAffiliate(formData, accessToken);
      toast.success(`Brand "${name}" created and linked.`);
      void queryClient.invalidateQueries({ queryKey: ["offers", "list"] });
      void queryClient.invalidateQueries({ queryKey: COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY });
      router.push("/brands");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Could not create brand."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Create brand from affiliate</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Register a merchant line using the partner tracking URL, map the GoGoCash app tracking link when you have it, and
        choose the advertiser store used in tracking links (same as offer edit / Commission Management).
      </p>
      <form onSubmit={handleSubmit} className="mt-6 max-w-4xl space-y-4">
        <FormSectionJumpNav
          links={[...CREATE_BRAND_JUMP_LINKS]}
          ariaLabel="Jump to create brand sections"
          className="border-b border-gray-200/90 pb-3 dark:border-gray-700/90"
        />

        <section id="create-brand-section-setup" className={`space-y-4 ${SCROLL_CLASS}`}>
        <div>
          <label htmlFor="create-brand-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="create-brand-network" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="create-brand-store" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="create-brand-tracking" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="create-brand-app-deeplink" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
            If set, saved as the commission tracking link mapping for this new offer (same as editing an offer → Tracking Links).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="create-brand-country" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Country
            </label>
            <select
              id="create-brand-country"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="create-brand-currency" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency
            </label>
            <input
              id="create-brand-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 8))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="THB"
            />
          </div>
        </div>

        {/* Brand visibility — controls whether this brand is shown to customers in other countries. */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <FieldLabel
            label="Availability"
            description="Country-specific brands are hidden from customers in other countries. Global brands appear worldwide and route customers without a dedicated country variant to the default country's tracking link."
          />
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/40">
              <input
                type="radio"
                name="create-brand-availability"
                checked={!isGlobal}
                onChange={() => setIsGlobal(false)}
                className="mt-0.5 h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900"
              />
              <span className="text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">Country-specific</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Only customers whose country is {countries} will see this brand. Customers in other countries won&apos;t see it on home, search, or category pages.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/40">
              <input
                type="radio"
                name="create-brand-availability"
                checked={isGlobal}
                onChange={() => setIsGlobal(true)}
                className="mt-0.5 h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900"
              />
              <span className="text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">Global / worldwide</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Every customer sees this brand. Customers from countries without a dedicated variant are routed to the default country&apos;s tracking link.
                </span>
              </span>
            </label>
            {isGlobal && (
              <div className="ml-7 mt-2">
                <label htmlFor="create-brand-default-country" className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Default country (fallback for users without a dedicated variant)
                </label>
                <select
                  id="create-brand-default-country"
                  value={defaultCountry}
                  onChange={(e) => setDefaultCountry(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When a Singapore user opens this brand and there&apos;s no SG variant, they&apos;ll be sent to the {defaultCountry} tracking link.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="create-brand-lookup" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                      setLookupValue(defaultLookupFromBrandAndCountry(brandName, countries));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900"
                />
                <span>Default: brand + country (e.g. apple_th)</span>
              </label>
              <button
                type="button"
                onClick={applyLookupDefaultOnce}
                disabled={syncLookupFromBrandCountry}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-400 dark:hover:text-brand-300"
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
          <p id="create-brand-lookup-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            With the default option on, the slug stays{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.7rem] dark:bg-gray-800">brandname_countrycode</code>{" "}
            (lowercase, non-alphanumeric → underscore) and updates when brand or country changes.
          </p>
        </div>
        </section>

        <section id="create-brand-section-brand" className={`space-y-4 ${SCROLL_CLASS}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Brand &amp; offer
          </h2>
          <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
            <div className="min-w-0 sm:max-w-md">
              <Switch
                key="create-brand-disabled"
                label="Disabled offer"
                defaultChecked={disabledOffer}
                onChange={setDisabledOffer}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Hide this offer from users.
              </p>
            </div>
            <div className="min-w-0 sm:max-w-md">
              <Switch
                key="create-brand-top-brands"
                label="Top Brands"
                defaultChecked={topBrands}
                onChange={setTopBrands}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Highlight this offer in top-brand placements in the app.
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <FieldLabel
              label="Commission (%)"
              description={
                commissionEntryMode === "auto"
                  ? "Uses the partner rate for this network after the offer exists: open the new offer and use “Fetch from partner & apply −30%”, or switch to Manual to type the user-facing % now."
                  : "Maximum % offered to users. Enter the value already reduced by 30% from the affiliate partner rate."
              }
            />
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant={commissionEntryMode === "manual" ? "primary" : "outline"}
                onClick={() => setCommissionEntryMode("manual")}
                className="touch-manipulation"
              >
                Manual
              </Button>
              <Button
                size="sm"
                type="button"
                variant={commissionEntryMode === "auto" ? "primary" : "outline"}
                onClick={() => setCommissionEntryMode("auto")}
                className="touch-manipulation"
              >
                From partner (-30%)
              </Button>
            </div>
            <Input
              type="text"
              value={commissionPercentInput}
              onChange={(e) => setCommissionPercentInput(e.target.value)}
              disabled={commissionEntryMode === "auto"}
              placeholder={
                commissionEntryMode === "auto"
                  ? "Set via offer editor after creation, or choose Manual"
                  : "e.g. 6"
              }
            />
            <div className="mt-3">
              <Switch
                key={`create-brand-all-pt-${allProductTypes ? "1" : "0"}`}
                label="All product types"
                defaultChecked={allProductTypes}
                onChange={setAllProductTypes}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Use one commission rate and tracking link for all lines. Turn off to add per-row names and commission.
              </p>
            </div>
          </div>
        </section>

        <section id="create-brand-section-product" className={`space-y-4 ${SCROLL_CLASS}`}>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Product Type
            </h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() =>
                  toast.success("Product type rows are included when you click Create brand below.")
                }
                className="min-h-11 w-full touch-manipulation sm:w-auto sm:shrink-0"
              >
                Save changes
              </Button>
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
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {allProductTypes ? (
              "Turn off “All product types” under Commission (%) to add per-line names and commission."
            ) : (
              <>
                Add a row for each product type with its name and commission info, then use{" "}
                <span className="font-medium">Create brand</span> below to persist.
              </>
            )}
          </p>
          {!allProductTypes && productTypes.length > 0 ? (
            <ul className="space-y-4">
              {productTypes.map((row, i) => {
                const baseId = `create-brand-pt-${i}`;
                return (
                  <li
                    key={i}
                    className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3"
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
                        onChange={(e) => {
                          const next = [...productTypes];
                          next[i] = { ...next[i], name: e.target.value };
                          setProductTypes(next);
                        }}
                        autoComplete="off"
                        enterKeyHint="next"
                        className="min-h-11 min-w-0 w-full touch-manipulation !text-base sm:!text-sm"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${baseId}-commission`}
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Commission info (-30% from affiliate partner)
                      </label>
                      <TextArea
                        id={`${baseId}-commission`}
                        rows={1}
                        placeholder="e.g. 5% on new customers"
                        value={row.commission_info}
                        onChange={(v) => {
                          const next = [...productTypes];
                          next[i] = { ...next[i], commission_info: v };
                          setProductTypes(next);
                        }}
                        className="h-11 min-h-11 max-h-11 resize-none overflow-y-auto touch-manipulation !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
                      />
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
                        className="min-h-11 w-full touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto"
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

        <section id="create-brand-section-offer-copy" className={`space-y-4 ${SCROLL_CLASS}`}>
        <div>
          <FieldLabel
            label="Max cap"
            description="Maximum cap offered to users. Enter the value already reduced by 30% from the affiliate partner cap."
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
            className="min-h-[5.5rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
          />
        </div>
        </section>

        <div
          id="create-brand-section-merch"
          className={`rounded-xl border border-dashed border-brand-200/80 bg-brand-50/50 p-4 dark:border-brand-800/60 dark:bg-brand-950/25 ${SCROLL_CLASS}`}
        >
          <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
            Commission info from partner
          </h3>
          <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-200/80">
            Structured terms as supplied by the partner or affiliate network. This does not change when you edit “Commission
            (%)” or “Max cap” above — partner max cap is separate and read-only here. Values appear after the offer is synced
            with a feed; new brands show placeholders until then.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tracking model
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">CPS</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Min / Max
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">—</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Max cap (partner)
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">—</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Currency (partner)
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                {currency.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Payment terms
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">—</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Validation terms
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">—</dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-brand-200/70 pt-5 dark:border-brand-800/50">
            <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              Offer tags (merchandising)
            </h3>
            <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-200/80">
              Optional labels for the offer card in the app: category, promos, and expiry messaging. Editable here; unrelated
              to partner rates above.
            </p>
            {offerTagPreviewChips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {offerTagPreviewChips.map((c, i) => (
                  <span
                    key={`create-brand-tag-preview-${i}`}
                    className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-brand-900 shadow-sm dark:bg-brand-950/60 dark:text-brand-100"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-brand-800/70 dark:text-brand-200/70">
                No tags enabled — use the toggles below to show pills in the app.
              </p>
            )}

            <div className="mt-4 space-y-5">
              <div>
                <Switch
                  key={`create-brand-odt-brand-${offerDisplayTags.brand_category_enabled}`}
                  label="Brand category"
                  defaultChecked={offerDisplayTags.brand_category_enabled}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({ ...prev, brand_category_enabled: e }))
                  }
                />
                <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Partner feed category:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {CREATE_BRAND_INITIAL_CATEGORY}
                  </span>
                  . Pick a system category below, or leave “Use partner feed” so the tag uses that value.
                </p>
                {offerDisplayTags.brand_category_enabled ? (
                  <div className="ml-6 mt-2 max-w-xl">
                    <label htmlFor="create-brand-tag-brand-category" className="sr-only">
                      Brand category tag
                    </label>
                    <select
                      id="create-brand-tag-brand-category"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-theme-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      value={offerDisplayTags.brand_category_label}
                      onChange={(e) =>
                        setOfferDisplayTags((prev) => ({
                          ...prev,
                          brand_category_label: e.target.value,
                        }))
                      }
                      disabled={policyCategoriesPending}
                    >
                      <option value="">Use partner feed ({CREATE_BRAND_INITIAL_CATEGORY})</option>
                      {legacyBrandCategoryLabel ? (
                        <option value={legacyBrandCategoryLabel}>
                          {legacyBrandCategoryLabel} (not in category list — choose a listed value to replace)
                        </option>
                      ) : null}
                      {categoriesForTagSelect.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {policyCategoriesPending ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading categories…</p>
                    ) : categoriesForTagSelect.length === 0 ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        No categories in the system yet. Add them under Category Management, or use partner feed.
                      </p>
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
                    setOfferDisplayTags((prev) => ({ ...prev, extra_cashback_tag: e }))
                  }
                />
                <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Show an “extra cashback” style promo tag (separate from Upsize in the offer editor).
                </p>
              </div>

              <div>
                <Switch
                  key={`create-brand-odt-grab-${offerDisplayTags.grab_coupon_tag}`}
                  label="Grab Coupon"
                  defaultChecked={offerDisplayTags.grab_coupon_tag}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({ ...prev, grab_coupon_tag: e }))
                  }
                />
                <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Highlight that users can claim a Grab-related coupon for this offer.
                </p>
              </div>

              <div>
                <Switch
                  key={`create-brand-odt-exp-${offerDisplayTags.expire_in_days_enabled}`}
                  label="Expire in X days"
                  defaultChecked={offerDisplayTags.expire_in_days_enabled}
                  onChange={(e) =>
                    setOfferDisplayTags((prev) => ({ ...prev, expire_in_days_enabled: e }))
                  }
                />
                <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Shows “Expire in {"{n}"} days” on the card. Set the number when enabled.
                </p>
                {offerDisplayTags.expire_in_days_enabled ? (
                  <div className="ml-6 mt-2 flex max-w-md flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Expire in</span>
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Terms &amp; conditions (policy)
          </h2>
          <FieldLabel
            label="Which category policy applies"
            description='Pick the category whose terms you configured under Policy Management. “Automatic” uses this offer’s own category label to resolve T&C in the app.'
          />
          <select
            id="create-brand-policy-category"
            className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={policyCategoryId}
            onChange={(e) => setPolicyCategoryId(e.target.value)}
          >
            <option value="">
              Automatic — use offer category ({CREATE_BRAND_INITIAL_CATEGORY})
            </option>
            {policyCategoriesSorted.map((cat) => {
              const policyText = policiesList[cat._id] ?? "";
              const hasPolicy = policyText.trim().length > 0;
              return (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                  {hasPolicy ? " — T&C configured" : " — no T&C yet"}
                </option>
              );
            })}
          </select>
          {policyCategoryId ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This brand will be pinned to the selected category’s policy text when created.
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No override: the app can match{" "}
              <span className="font-medium">{CREATE_BRAND_INITIAL_CATEGORY}</span> to a category and load its policy.
            </p>
          )}
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-600">
            <FieldLabel
              label="Custom terms (this merchant)"
              description="Optional terms for this offer only, shown in addition to the category policy above. Use for merchant-specific rules or legal supplements; your app should merge or append with Policy Management text."
            />
            <TextArea
              rows={5}
              placeholder="e.g. Brand-specific eligibility · stacked promotions not allowed · see partner site for full rules"
              value={customTerms}
              onChange={setCustomTerms}
              className="min-h-[6rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
            />
          </div>
        </section>

        {/* Logos & media — same structure as FormOffer `offer-section-media` */}
        <section id="create-brand-section-media" className={`space-y-4 ${SCROLL_CLASS}`}>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Logos &amp; media
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload images for desktop, mobile, and banners. Leave empty to use defaults after the brand is created.
          </p>

          <div>
            <FieldLabel label="Logo (desktop)" description="Main logo for desktop layout." />
            <Input
              id="create-brand-logo-desktop"
              type="file"
              name="logo_desktop"
              accept="image/*"
              onChange={(e) => setLogoDesktop(e.target.files?.[0] ?? null)}
            />
            {logoDesktop && logoDesktopPreview ? (
              <RemoteOrBlobImage
                src={logoDesktopPreview}
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            ) : null}
          </div>

          <div>
            <FieldLabel label="Logo (mobile)" description="Logo for mobile layout." />
            <Input
              id="create-brand-logo-mobile"
              type="file"
              name="logo_mobile"
              accept="image/*"
              onChange={(e) => setLogoMobile(e.target.files?.[0] ?? null)}
            />
            {logoMobile && logoMobilePreview ? (
              <RemoteOrBlobImage
                src={logoMobilePreview}
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            ) : null}
          </div>

          <div>
            <FieldLabel label="Banner (desktop)" description="Hero or banner image on desktop." />
            <Input
              id="create-brand-banner-desktop"
              type="file"
              name="banner"
              accept="image/*"
              onChange={(e) => setBannerDesktop(e.target.files?.[0] ?? null)}
            />
            {bannerDesktop && bannerDesktopPreview ? (
              <RemoteOrBlobImage
                src={bannerDesktopPreview}
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            ) : null}
          </div>

          <div>
            <FieldLabel label="Banner (mobile)" description="Banner image on mobile." />
            <Input
              id="create-brand-banner-mobile"
              type="file"
              name="banner_mobile"
              accept="image/*"
              onChange={(e) => setBannerMobile(e.target.files?.[0] ?? null)}
            />
            {bannerMobile && bannerMobilePreview ? (
              <RemoteOrBlobImage
                src={bannerMobilePreview}
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            ) : null}
          </div>

          <div>
            <FieldLabel label="Logo (circle)" description="Circular or avatar-style logo." />
            <Input
              id="create-brand-logo-circle"
              type="file"
              name="logo_circle"
              accept="image/*"
              onChange={(e) => setLogoCircle(e.target.files?.[0] ?? null)}
            />
            {logoCircle && logoCirclePreview ? (
              <RemoteOrBlobImage
                src={logoCirclePreview}
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            ) : null}
          </div>
        </section>

        <section id="create-brand-section-internal" className={`space-y-4 ${SCROLL_CLASS}`}>
        <div>
          <label htmlFor="create-brand-desc" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
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

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Link
            href="/brands"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {submitting ? "Creating…" : "Create brand"}
          </button>
        </div>
      </form>
    </div>
  );
}
