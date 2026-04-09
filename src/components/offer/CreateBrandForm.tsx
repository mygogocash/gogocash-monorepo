"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AFFILIATE_NETWORKS } from "@/data/affiliateNetworks";
import { DEEPLINK_STORE_OPTIONS } from "@/data/deeplinkStores";
import type { CreateBrandFromAffiliatePayload } from "@/types/api";
import toast from "react-hot-toast";
import { useDataSession } from "@/hooks/useDataSession";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { defaultLookupFromBrandAndCountry } from "@/lib/createBrandLookupSlug";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY } from "@/lib/query/offersQueries";

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
  const [commissionPercent, setCommissionPercent] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    let commission_store: number | null = null;
    const cp = commissionPercent.trim();
    if (cp) {
      const n = parseFloat(cp);
      if (Number.isNaN(n)) {
        toast.error("Commission % must be a number.");
        return;
      }
      commission_store = n;
    }
    const payload: CreateBrandFromAffiliatePayload = {
      brand_name: name,
      affiliate_network_id: affiliateNetworkId,
      affiliate_tracking_link: link,
      countries,
      currency,
      deeplink_store_id: deeplinkStoreId,
      description: description.trim() || undefined,
      lookup_value: lookupValue.trim() || undefined,
      commission_store,
    };
    const app = appDeeplink.trim();
    if (app) payload.app_deeplink = app;

    setSubmitting(true);
    try {
      await apiClient.createBrandFromAffiliate(payload, accessToken);
      toast.success(`Brand "${name}" created and linked.`);
      void queryClient.invalidateQueries({ queryKey: ["offers", "list"] });
      void queryClient.invalidateQueries({ queryKey: COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY });
      router.push("/offers");
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
      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
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
        <div>
          <label htmlFor="create-brand-commission" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default commission % (optional)
          </label>
          <input
            id="create-brand-commission"
            type="text"
            inputMode="decimal"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            placeholder="e.g. 5"
          />
        </div>
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
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Link
            href="/offers"
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
