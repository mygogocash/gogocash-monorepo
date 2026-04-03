"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import Select from "@/components/form/Select";
import {
  getDefaultMockPendingOffers,
  getMockPendingOffers,
  offerMatchesCountryFilter,
  persistMockPendingOffers,
  resetMockPendingOffersToDefault,
  type PendingOfferRow,
} from "@/data/mockPendingOffers";
import { pathImage } from "@/utils/helper";
import { hasNonEmptyString, OFFER_THUMB_SIZES } from "./offerMedia";
import { displayAffiliatePartner, formatSubmitted } from "./PendingOfferReviewContent";

const COUNTRY_OPTIONS = [
  { label: "All", value: "" },
  { label: "🇹🇭 Thailand", value: "Thailand" },
  { label: "🇮🇩 Indonesia", value: "Indonesia" },
  { label: "🇻🇳 Vietnam", value: "Vietnam" },
  { label: "🇵🇭 Philippines", value: "Philippines" },
  { label: "🇮🇳 India", value: "India" },
  { label: "🇲🇾 Malaysia", value: "Malaysia" },
  { label: "🇧🇷 Brazil", value: "Brazil" },
  {
    label: "🇺🇸 United States of America",
    value: "United States of America",
  },
  { label: "🇬🇧 United Kingdom", value: "United Kingdom" },
  { label: "🇸🇬 Singapore", value: "Singapore" },
  { label: "🇲🇲 Myanmar", value: "Myanmar" },
];

/**
 * Review queue for merchant-submitted offers: same columns as Offers Management plus approve/reject.
 * Wire list + mutations to your backend when leaving mock data.
 */
export default function NewOfferPanel() {
  const router = useRouter();
  /** Match SSR initial HTML (defaults only); session sync runs after mount to avoid hydration errors. */
  const [rows, setRows] = useState<PendingOfferRow[]>(() => getDefaultMockPendingOffers());
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setRows(getMockPendingOffers());
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((offer) => {
      if (!offerMatchesCountryFilter(offer, country)) return false;
      if (!q) return true;
      const partner = displayAffiliatePartner(offer).toLowerCase();
      return (
        offer.offer_name.toLowerCase().includes(q) ||
        (offer.offer_name_display ?? "").toLowerCase().includes(q) ||
        partner.includes(q) ||
        (offer.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, country]);

  const openReviewPage = (offer: PendingOfferRow) => {
    router.push(`/offers/pending/${offer._id}`);
  };

  const handleApprove = (offer: PendingOfferRow) => {
    setRows((prev) => {
      const next = prev.filter((o) => o._id !== offer._id);
      persistMockPendingOffers(next);
      return next;
    });
    toast.success(`Approved “${offer.offer_name_display || offer.offer_name}”.`);
  };

  const handleReject = (offer: PendingOfferRow) => {
    if (
      !confirm(
        `Reject “${offer.offer_name_display || offer.offer_name}”? This cannot be undone in the mock UI.`,
      )
    ) {
      return;
    }
    setRows((prev) => {
      const next = prev.filter((o) => o._id !== offer._id);
      persistMockPendingOffers(next);
      return next;
    });
    toast(`Rejected “${offer.offer_name_display || offer.offer_name}”.`, {
      icon: "⛔",
    });
  };

  const resetDemo = () => {
    setRows(resetMockPendingOffersToDefault());
    setSearch("");
    setCountry("");
    toast.success("Restored demo pending offers.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New offer — review queue
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
              Review merchant submissions before they appear in the main Offers list. Click a row to open
              the full review page. Columns mirror the Offers tab (logos, partner, caps, countries). Approve
              to publish (mock removes the row) or reject to send back. Replace this mock list with your
              create-offer / approval API.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDemo}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Reset demo data
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pending: <span className="font-medium text-gray-800 dark:text-gray-200">{rows.length}</span>
            {search.trim() || country ? (
              <span className="ml-2">
                (showing {filtered.length} with current filters)
              </span>
            ) : null}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search name, partner, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-[280px]"
            />
            <Select
              options={COUNTRY_OPTIONS}
              placeholder="Select country"
              defaultValue={country}
              onChange={(v) => setCountry(v)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-700">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Submissions
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Click any row to open the full review page. Approve or Reject from the row or from that page.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-12 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
              {rows.length === 0
                ? "No pending offers. Use “Reset demo data” to load the sample queue."
                : "No rows match your search or country filter."}
            </div>
          ) : (
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Affiliate partner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Logo desktop
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Logo mobile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Banner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Logo circle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Active policy
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Max cap
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Max commission
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {filtered.map((offer, index) => {
                    const logoDesktopSrc = pathImage(offer.logo_desktop);
                    const logoMobileSrc = pathImage(offer.logo_mobile);
                    const bannerSrc = pathImage(offer.banner, "banner");
                    const logoCircleSrc = pathImage(offer.logo_circle);
                    return (
                      <tr
                        key={offer._id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open review page for ${offer.offer_name}`}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => openReviewPage(offer)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openReviewPage(offer);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          {index + 1}
                        </td>
                        <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              {offer.logo ? (
                                <RemoteOrBlobImage
                                  className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                  src={offer.logo}
                                  alt={offer.offer_name}
                                  width={48}
                                  height={48}
                                  sizes={OFFER_THUMB_SIZES}
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-300 dark:bg-gray-600 sm:h-12 sm:w-12">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                    {offer.offer_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-2 min-w-0 sm:ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {offer.offer_name}
                              </div>
                              <div className="text-sm text-gray-800 dark:text-gray-200">
                                New name:{" "}
                                {offer.offer_name_display
                                  ? offer.offer_name_display
                                  : "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="min-w-0 max-w-[160px] px-4 py-3 sm:px-6 sm:py-4">
                          <div className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">
                            {displayAffiliatePartner(offer)}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12">
                            {hasNonEmptyString(logoDesktopSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoDesktopSrc}
                                alt=""
                                width={48}
                                height={48}
                                sizes={OFFER_THUMB_SIZES}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400 sm:h-12 sm:w-12">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12">
                            {hasNonEmptyString(logoMobileSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoMobileSrc}
                                alt=""
                                width={48}
                                height={48}
                                sizes={OFFER_THUMB_SIZES}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400 sm:h-12 sm:w-12">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12">
                            {hasNonEmptyString(bannerSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={bannerSrc}
                                alt=""
                                width={48}
                                height={48}
                                sizes={OFFER_THUMB_SIZES}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400 sm:h-12 sm:w-12">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12">
                            {hasNonEmptyString(logoCircleSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoCircleSrc}
                                alt=""
                                width={48}
                                height={48}
                                sizes={OFFER_THUMB_SIZES}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400 sm:h-12 sm:w-12">
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                          <div className="break-words text-sm text-gray-900 dark:text-gray-100">
                            {offer.categories || "Uncategorized"}
                          </div>
                          {offer.currency ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Currency: {offer.currency}
                            </div>
                          ) : null}
                        </td>
                        <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                          <div className="max-w-[140px] break-words text-sm text-gray-900 dark:text-gray-100">
                            {offer.countries
                              ? offer.countries
                                  .split(",")
                                  .map((c) => c.trim())
                                  .filter(Boolean)
                                  .join(", ")
                              : "—"}
                          </div>
                        </td>
                        <td className="min-w-0 max-w-[200px] px-4 py-3 sm:px-6 sm:py-4">
                          <div
                            className="line-clamp-2 break-words text-sm text-gray-900 dark:text-gray-100"
                            title={offer.description || undefined}
                          >
                            {offer.description
                              ? offer.description.length > 100
                                ? `${offer.description.slice(0, 100)}...`
                                : offer.description
                              : "—"}
                          </div>
                        </td>
                        <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                          <div className="break-words text-sm text-gray-900 dark:text-gray-100">
                            {offer.active_policy ?? offer.categories ?? "—"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100 sm:px-6 sm:py-4">
                          {offer.max_cap != null
                            ? offer.max_cap.toLocaleString()
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100 sm:px-6 sm:py-4">
                          {offer.commission_store != null
                            ? `${offer.commission_store}%`
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300 sm:px-6 sm:py-4">
                          {formatSubmitted(offer.submitted_at)}
                        </td>
                        <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                            Pending review
                          </span>
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() => handleApprove(offer)}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(offer)}
                              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
