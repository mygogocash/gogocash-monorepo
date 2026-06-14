"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBoostRules,
  getFeaturedTerms,
  getSearchBlacklist,
  postBoostRule,
  postFeaturedTerm,
  postSearchBlacklist,
} from "@/lib/api/adminModulesApi";
import type { Offer } from "@/types/api";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import { OFFERS_COUNTRY_FILTER_OPTIONS } from "@/lib/offerCountries";
import Button from "@/components/ui/button/Button";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import { TrashBinIcon } from "@/icons";
import StatusTag from "@/components/ui/StatusTag";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { OFFER_THUMB_SIZES } from "@/components/offer/offerMedia";
import { pathImage } from "@/utils/helper";
import toast from "react-hot-toast";
import { useEffect, useMemo, useRef, useState } from "react";

const offerLabel = (o: Offer): string =>
  (o.offer_name_display || o.offer_name || o._id).trim();

type Treatment = "pinned" | "boost" | "hidden";
type Shop = {
  id: string;
  label: string;
  logo: string;
  category: string;
  country: string;
};

// "These shops are" options → which list the rule is saved to.
const TREATMENTS: { value: Treatment; label: string }[] = [
  { value: "pinned", label: "Pinned search" },
  { value: "boost", label: "Boost search" },
  { value: "hidden", label: "Blocked search" },
];

// Status label + badge colors per treatment, for the Search Config summary.
const STATUS_META: Record<Treatment, { label: string; className: string }> = {
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
  hidden: {
    label: "Blocked",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

// One row of the Search Config summary — a brand and the search type it's set to.
type ConfigRule = {
  key: string;
  label: string;
  logo: string;
  category: string;
  country: string;
  status: Treatment;
  keywords: string[];
};

// Toggle pills — same design as the "Insert :" toggle in the offer editor.
const PILL_BASE =
  "inline-flex h-7 items-center justify-center rounded-lg border px-3 text-xs transition touch-manipulation disabled:cursor-not-allowed";
function pillClass(active: boolean): string {
  return active
    ? `${PILL_BASE} border-brand-500 bg-brand-500 font-medium text-white hover:bg-brand-600 disabled:bg-brand-300`
    : `${PILL_BASE} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800`;
}

export default function SearchConfigManagement() {
  const qc = useQueryClient();
  // Accumulated summary of saved rules (brand + which search type it's set to).
  const [configRules, setConfigRules] = useState<ConfigRule[]>([]);

  // Rule builder state.
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCountry, setPickerCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const countryBoxRef = useRef<HTMLDivElement>(null);
  const [selectedShops, setSelectedShops] = useState<Shop[]>([]);
  const [shopsConfirmed, setShopsConfirmed] = useState(false);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [addKeywords, setAddKeywords] = useState(false);
  const [kwDraft, setKwDraft] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const ftQ = useQuery({
    queryKey: ["admin", "search", "ft"],
    queryFn: getFeaturedTerms,
  });
  const brQ = useQuery({
    queryKey: ["admin", "search", "br"],
    queryFn: getBoostRules,
  });
  const blQ = useQuery({
    queryKey: ["admin", "search", "bl"],
    queryFn: getSearchBlacklist,
  });

  // Brand search — same offers source (and country filter) as the Brands table
  // toolbar; a country can be picked to scope or browse the brand list.
  const pickerQuery = useMemo(
    () => ({
      search: pickerSearch.trim(),
      page: 1,
      limit: 30,
      country: pickerCountry,
    }),
    [pickerSearch, pickerCountry],
  );
  const pickerActive =
    pickerSearch.trim().length > 0 || pickerCountry.length > 0;
  const { data: offersPick } = useQuery({
    queryKey: offersListQueryKey(pickerQuery),
    queryFn: () => fetchOffersList(pickerQuery),
    enabled: pickerActive,
  });
  const pickerResults = useMemo(() => {
    const chosen = new Set(selectedShops.map((s) => s.id));
    const seen = new Set<string>();
    const out: Shop[] = [];
    for (const o of offersPick?.data ?? []) {
      if (chosen.has(o._id)) continue; // already selected
      const label = offerLabel(o);
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({
        id: o._id,
        label,
        logo: o.logo_desktop ?? "",
        category: o.categories || "Uncategorized",
        country: o.countries ?? "",
      });
    }
    return out.slice(0, 12);
  }, [offersPick?.data, selectedShops]);

  // Country combobox — type to filter the list; "All countries" clears it.
  const countryLabel = pickerCountry
    ? (OFFERS_COUNTRY_FILTER_OPTIONS.find((o) => o.value === pickerCountry)
        ?.label ?? pickerCountry)
    : "";
  const countryMatches = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return OFFERS_COUNTRY_FILTER_OPTIONS;
    return OFFERS_COUNTRY_FILTER_OPTIONS.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [countryQuery]);
  function selectCountry(value: string) {
    setPickerCountry(value);
    setCountryQuery("");
    setCountryOpen(false);
  }
  useEffect(() => {
    if (!countryOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        countryBoxRef.current &&
        !countryBoxRef.current.contains(e.target as Node)
      ) {
        setCountryOpen(false);
        setCountryQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [countryOpen]);

  function addShop(s: Shop) {
    setSelectedShops((p) => (p.some((x) => x.id === s.id) ? p : [...p, s]));
  }
  function removeShop(id: string) {
    setSelectedShops((p) => p.filter((s) => s.id !== id));
  }
  function removeConfigRule(key: string) {
    setConfigRules((p) => p.filter((r) => r.key !== key));
  }
  function resetBuilder() {
    setSelectedShops([]);
    setShopsConfirmed(false);
    setTreatment(null);
    setAddKeywords(false);
    setKwDraft("");
    setKeywords([]);
    setPickerSearch("");
    setPickerCountry("");
    setCountryQuery("");
    setCountryOpen(false);
  }

  // Apply the chosen treatment to every selected shop, routed to its list.
  const save = useMutation({
    mutationFn: async (): Promise<Treatment | null> => {
      if (!selectedShops.length || !treatment) return null;
      const kws = addKeywords ? keywords.filter((k) => k.trim()) : [];
      for (const shop of selectedShops) {
        if (treatment === "pinned") {
          const list = kws.length ? kws : [""];
          for (const k of list) {
            await postFeaturedTerm({
              keyword: k,
              targetType: "merchant",
              targetId: shop.id,
              targetName: shop.label,
              displayOrder: (ftQ.data?.length ?? 0) + 1,
              isActive: true,
            });
          }
        } else if (treatment === "boost") {
          await postBoostRule({
            targetType: "offer",
            targetId: shop.id,
            targetName: shop.label,
            boostScore: 5,
            isActive: true,
            expiryDate: "2026-12-31",
          });
        } else {
          const list = kws.length ? kws : [shop.label];
          for (const k of list) {
            await postSearchBlacklist({
              keyword: k,
              addedBy: "a1",
              addedDate: "",
              notes: shop.label,
            });
          }
        }
      }
      return treatment;
    },
    onSuccess: (t) => {
      if (!t) return;
      // Record each saved brand into the Search Config summary (dedupe by
      // brand + status). selectedShops is still set here (reset runs below).
      const ruleKeywords = addKeywords ? keywords.filter((k) => k.trim()) : [];
      setConfigRules((prev) => {
        const seen = new Set(prev.map((r) => r.key));
        const rows = selectedShops
          .map((s) => ({
            key: `${s.id}-${t}`,
            label: s.label,
            logo: s.logo,
            category: s.category,
            country: s.country,
            status: t,
            keywords: ruleKeywords,
          }))
          .filter((r) => !seen.has(r.key));
        return [...prev, ...rows];
      });
      toast.success("Rule saved");
      const key = t === "pinned" ? "ft" : t === "boost" ? "br" : "bl";
      void qc.invalidateQueries({ queryKey: ["admin", "search", key] });
      resetBuilder();
    },
    onError: () => toast.error("Could not save rule"),
  });

  if (ftQ.isLoading || brQ.isLoading || blQ.isLoading)
    return <AdminTableSkeleton />;

  if (ftQ.isError || brQ.isError || blQ.isError) {
    return (
      <AdminQueryError
        title="Could not load search configuration"
        onRetry={() => {
          void ftQ.refetch();
          void brQ.refetch();
          void blQ.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Rule builder — pick shops, save the selection, then choose how they
      appear in search and save again. */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Add a search rule
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Find shops, save the selection, then choose how they appear in
            search.
          </p>
        </div>

        {/* 1. Search for brand (while still picking shops) */}
        {!shopsConfirmed && (
          <div>
            <div className="mb-1.5">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Search for brand
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                Search by name, partner, or offer ID, and/or filter by country.
              </p>
            </div>
            <div className="flex max-w-2xl flex-col gap-2 sm:flex-row">
              <div className="w-full sm:w-[428px]">
                <Input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search name, partner, or offer ID…"
                />
              </div>
              <div className="relative sm:w-52" ref={countryBoxRef}>
                <Input
                  type="text"
                  value={countryOpen ? countryQuery : countryLabel}
                  onChange={(e) => {
                    setCountryQuery(e.target.value);
                    setCountryOpen(true);
                  }}
                  onFocus={() => {
                    setCountryQuery("");
                    setCountryOpen(true);
                  }}
                  placeholder="All countries"
                  ariaLabel="Filter brands by country"
                />
                {countryOpen && (
                  <ul className="absolute top-full right-0 left-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {countryQuery.trim() === "" && (
                      <li>
                        <button
                          type="button"
                          onClick={() => selectCountry("")}
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          All countries
                        </button>
                      </li>
                    )}
                    {countryMatches.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No matches.
                      </li>
                    ) : (
                      countryMatches.map((opt) => (
                        <li key={opt.value}>
                          <button
                            type="button"
                            onClick={() => selectCountry(opt.value)}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
            {/* 2. Select shops — click to add (more than one) */}
            {pickerActive && (
              <ul className="mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 sm:w-[428px] dark:border-gray-700">
                {pickerResults.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No matches.
                  </li>
                ) : (
                  pickerResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => addShop(r)}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {r.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {/* Selected brands — table (matches the "Added product type list" table) */}
        {selectedShops.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
              Selected Brands
            </p>
            <div className="w-full max-w-2xl overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                    >
                      Country
                    </th>
                    <th
                      scope="col"
                      className="w-24 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedShops.map((s) => {
                    const logoSrc = pathImage(s.logo);
                    const countries = s.country
                      ? s.country
                          .split(",")
                          .map((c) => c.trim())
                          .filter(Boolean)
                          .join(", ")
                      : "—";
                    return (
                      <tr
                        key={s.id}
                        className="bg-white transition-colors dark:bg-gray-900"
                      >
                        {/* Logo / name / category */}
                        <td className="min-w-0 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0">
                              {logoSrc ? (
                                <RemoteOrBlobImage
                                  className="h-10 w-10 rounded-lg object-cover"
                                  src={logoSrc}
                                  alt={s.label}
                                  width={40}
                                  height={40}
                                  sizes={OFFER_THUMB_SIZES}
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                                  —
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {s.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {s.category}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Country */}
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {countries}
                        </td>
                        {/* Action */}
                        <td className="w-24 px-4 py-3 text-left">
                          {!shopsConfirmed && (
                            <button
                              type="button"
                              onClick={() => removeShop(s.id)}
                              className="text-gray-400 transition hover:text-red-600 dark:hover:text-red-400"
                              aria-label={`Remove ${s.label}`}
                            >
                              <TrashBinIcon
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                              />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Save the shop selection before settings appear */}
        {!shopsConfirmed && (
          <div>
            <SecondaryButton
              onClick={() => setShopsConfirmed(true)}
              disabled={selectedShops.length === 0}
            >
              Save
            </SecondaryButton>
          </div>
        )}

        {/* 4. Setting options (only after the selection is saved) */}
        {shopsConfirmed && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set these shops as :
              </span>
              {TREATMENTS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={treatment === t.value}
                  onClick={() => setTreatment(t.value)}
                  className={pillClass(treatment === t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div>
              <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                <Switch
                  label=""
                  defaultChecked={addKeywords}
                  onChange={setAddKeywords}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Add Keywords
                  </p>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    Matching is case-insensitive — “Sport” also covers “sport”
                    and “SPORT”.
                  </p>
                </div>
              </div>
              {addKeywords && (
                <div className="mt-2 max-w-md space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={kwDraft}
                      onChange={(e) => setKwDraft(e.target.value)}
                      placeholder="Keyword"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!kwDraft.trim()}
                      onClick={() => {
                        const k = kwDraft.trim();
                        if (!k) return;
                        // Case-insensitive: "Sport" already covers "sport" / "SPORT".
                        const dupe = keywords.some(
                          (x) => x.toLowerCase() === k.toLowerCase(),
                        );
                        if (dupe) {
                          setKwDraft("");
                          return;
                        }
                        setKeywords((p) => [...p, k]);
                        setKwDraft("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((k) => (
                        <span
                          key={k}
                          className="border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                        >
                          {k}
                          <button
                            type="button"
                            onClick={() =>
                              setKeywords((p) => p.filter((x) => x !== k))
                            }
                            className="text-brand-400 hover:text-red-600 dark:hover:text-red-400"
                            aria-label={`Remove ${k}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Save the rule (applies to every selected shop) */}
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                onClick={() => void save.mutateAsync()}
                disabled={!treatment || save.isPending}
              >
                Save
              </SecondaryButton>
              <SecondaryButton onClick={() => setShopsConfirmed(false)}>
                Back
              </SecondaryButton>
            </div>
          </>
        )}
      </div>

      {/* Search Config summary — every configured brand and its search type. */}
      {configRules.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Search Config
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Brands you’ve configured and the search type each is set to.
            </p>
          </div>
          <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th
                    scope="col"
                    className="w-12 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Country
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Keywords
                  </th>
                  <th
                    scope="col"
                    className="w-24 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {configRules.map((r, i) => {
                  const logoSrc = pathImage(r.logo);
                  const countries = r.country
                    ? r.country
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .join(", ")
                    : "—";
                  const meta = STATUS_META[r.status];
                  return (
                    <tr
                      key={r.key}
                      className="bg-white transition-colors dark:bg-gray-900"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {i + 1}
                      </td>
                      {/* Logo / name / category */}
                      <td className="min-w-0 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0">
                            {logoSrc ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover"
                                src={logoSrc}
                                alt={r.label}
                                width={40}
                                height={40}
                                sizes={OFFER_THUMB_SIZES}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {r.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {r.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Country */}
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {countries}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusTag className={meta.className}>
                          {meta.label}
                        </StatusTag>
                      </td>
                      {/* Keywords */}
                      <td className="px-4 py-3">
                        {r.keywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.keywords.map((k) => (
                              <span
                                key={k}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        )}
                      </td>
                      {/* Action */}
                      <td className="w-24 px-4 py-3 text-left">
                        <button
                          type="button"
                          onClick={() => removeConfigRule(r.key)}
                          className="text-gray-400 transition hover:text-red-600 dark:hover:text-red-400"
                          aria-label={`Remove ${r.label}`}
                        >
                          <TrashBinIcon
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
