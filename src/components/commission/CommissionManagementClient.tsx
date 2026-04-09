"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import client from "@/lib/axios/client";
import type { AffiliateNetwork } from "@/data/affiliateNetworks";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY } from "@/lib/query/offersQueries";

export type CommissionBrandRow = {
  id: string;
  name: string;
  merchantId: number;
  currency: string;
  partnerRates: string[];
  adminCommission: number | null;
  trackingLink: string;
  appDeeplink: string;
  affiliateNetworkId: string;
  affiliateNetworkName: string;
};

export type FetchBestResponse = {
  bestRatePercent: number;
  currency: string;
  suggestedDeeplink: string;
  trackingModel: string;
  partnerRates: string[];
  offerName: string;
  affiliateNetworkId: string;
  affiliateNetworkName: string;
};

async function getNetworks(): Promise<{ data: AffiliateNetwork[] }> {
  const { data } = await client.get<{ data: AffiliateNetwork[] }>(
    "/admin/commission-management/networks",
  );
  return data;
}

async function getBrands(networkId: string): Promise<{ data: CommissionBrandRow[] }> {
  const { data } = await client.get<{ data: CommissionBrandRow[] }>(
    "/admin/commission-management/brands",
    { params: networkId ? { networkId } : {} },
  );
  return data;
}

type CommissionManagementClientProps = {
  /** When true, skip the page breadcrumb (e.g. embedded under Offers Management tabs). */
  embedded?: boolean;
};

export default function CommissionManagementClient({
  embedded = false,
}: CommissionManagementClientProps) {
  const queryClient = useQueryClient();
  const [selectedNetworkId, setSelectedNetworkId] = useState("involve_asia");
  /** Empty string means “first brand in list” until user picks explicitly. */
  const [selectedOfferId, setSelectedOfferId] = useState("");
  /** When non-null, user or “fetch best” has overridden the server deeplink for the field. */
  const [deeplinkOverride, setDeeplinkOverride] = useState<string | null>(null);

  const { data: networksRes, isLoading: networksLoading } = useQuery({
    queryKey: ["commission-management-networks"],
    queryFn: getNetworks,
    staleTime: 60_000,
  });

  const networks = networksRes?.data ?? [];

  const { data: brandsRes, isLoading: brandsLoading } = useQuery({
    queryKey: [...COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY, selectedNetworkId],
    queryFn: () => getBrands(selectedNetworkId),
    staleTime: 30_000,
  });

  const brands = useMemo(() => brandsRes?.data ?? [], [brandsRes?.data]);

  const resolvedOfferId = selectedOfferId || brands[0]?.id || "";

  const selected = useMemo(
    () => brands.find((b) => b.id === resolvedOfferId) ?? null,
    [brands, resolvedOfferId],
  );

  const deeplinkDraft =
    deeplinkOverride !== null
      ? deeplinkOverride
      : (selected?.appDeeplink ?? "");

  const fetchBest = useMutation({
    mutationFn: async (payload: { offerId: string; affiliateNetworkId: string }) => {
      const { data } = await client.post<FetchBestResponse>(
        "/admin/commission-management/fetch-best",
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      setDeeplinkOverride(data.suggestedDeeplink);
      toast.success(
        `Best rate via ${data.affiliateNetworkName}: ${data.bestRatePercent}% (${data.currency})`,
      );
    },
    onError: (err) => {
      const msg =
        isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String((err.response.data as { message?: string }).message)
          : "Could not fetch best commission. Try again.";
      toast.error(msg);
    },
  });

  const saveDeeplink = useMutation({
    mutationFn: async (payload: { offerId: string; deeplink: string }) => {
      const { data } = await client.patch<{ success: boolean }>(
        "/admin/commission-management/deeplink",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY,
      });
      setDeeplinkOverride(null);
      toast.success("Deeplink saved for this brand.");
    },
    onError: () => {
      toast.error("Could not save deeplink.");
    },
  });

  const onFetchBest = useCallback(() => {
    if (!selectedNetworkId) {
      toast.error("Select an affiliate network first.");
      return;
    }
    if (!resolvedOfferId) {
      toast.error("Select a brand / merchant first.");
      return;
    }
    fetchBest.mutate({
      offerId: resolvedOfferId,
      affiliateNetworkId: selectedNetworkId,
    });
  }, [fetchBest, resolvedOfferId, selectedNetworkId]);

  const onSaveDeeplink = useCallback(() => {
    if (!resolvedOfferId) {
      toast.error("Select a brand / merchant first.");
      return;
    }
    const d = deeplinkDraft.trim();
    if (!d) {
      toast.error("Enter a deeplink URL.");
      return;
    }
    saveDeeplink.mutate({ offerId: resolvedOfferId, deeplink: d });
  }, [deeplinkDraft, resolvedOfferId, saveDeeplink]);

  const lastFetch = fetchBest.data;

  return (
    <div className="min-w-0 space-y-6">
      {!embedded ? (
        <PageBreadcrumb
          pageTitle="Commission Management"
          items={[
            { label: "Home", href: "/dashboard" },
            { label: "Offers Management", href: "/offers" },
            { label: "Commission Management" },
          ]}
        />
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Best commission &amp; deeplink
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose a connected affiliate network, pick a merchant, then fetch the best
          commission rate for users from that network&apos;s feed. Update the app
          deeplink when ready. Mock data only; wire your backend to the same
          routes for production.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Connected affiliate networks
            </p>
            <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              {networksLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading networks…</p>
              ) : networks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No networks configured.</p>
              ) : (
                <ul className="space-y-2">
                  {networks.map((n) => (
                    <li
                      key={n.id}
                      className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-200/80 pb-2 last:border-0 last:pb-0 dark:border-gray-700/80"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.name}</p>
                        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{n.shortDescription}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          n.connected
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {n.connected ? "Connected" : "Offline"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="commission-affiliate-network"
              className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Fetch offers from network
            </label>
            <select
              id="commission-affiliate-network"
              className="h-11 w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={selectedNetworkId}
              onChange={(e) => {
                setSelectedNetworkId(e.target.value);
                setSelectedOfferId("");
                setDeeplinkOverride(null);
              }}
              disabled={networksLoading || networks.length === 0}
            >
              {networksLoading ? (
                <option value="">Loading…</option>
              ) : (
                networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Merchants below are filtered to offers synced from this network (Involve Asia, Optimise,
              Accesstrade, etc.).
            </p>
          </div>

          <div>
            <label
              htmlFor="commission-brand"
              className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Brand / merchant
            </label>
            <select
              id="commission-brand"
              className="h-11 w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={resolvedOfferId}
              onChange={(e) => {
                setSelectedOfferId(e.target.value);
                setDeeplinkOverride(null);
              }}
              disabled={brandsLoading || networksLoading || brands.length === 0}
            >
              {brandsLoading ? (
                <option value="">Loading…</option>
              ) : brands.length === 0 ? (
                <option value="">No merchants for this network</option>
              ) : (
                brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · merchant {b.merchantId} · {b.currency} · {b.affiliateNetworkName}
                  </option>
                ))
              )}
            </select>
          </div>

          {selected ? (
            <dl className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-sm sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-800/40">
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Affiliate network
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {selected.affiliateNetworkName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Partner rates (feed)
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {selected.partnerRates?.length
                    ? selected.partnerRates.join(" · ")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Admin commission (%)
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {selected.adminCommission ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Partner tracking link
                </dt>
                <dd className="mt-0.5 break-all text-gray-800 dark:text-gray-200">
                  {selected.trackingLink ? (
                    <a
                      href={selected.trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-400 underline"
                    >
                      {selected.trackingLink}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="sm"
              onClick={onFetchBest}
              disabled={
                !resolvedOfferId || !selectedNetworkId || fetchBest.isPending || networksLoading
              }
              startIcon={
                fetchBest.isPending ? (
                  <span className="border-t-brand-500 inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600" />
                ) : null
              }
            >
              Fetch best commission for users
            </Button>
          </div>

          {lastFetch ? (
            <div className="border-brand-200/80 bg-brand-50/50 dark:border-brand-800/60 dark:bg-brand-950/25 rounded-xl border border-dashed p-4">
              <p className="text-brand-900 dark:text-brand-100 text-sm font-semibold">
                Result · {lastFetch.offerName}
              </p>
              <ul className="text-brand-900/90 dark:text-brand-100/90 mt-2 space-y-1 text-sm">
                <li>
                  <span className="font-medium">Network: </span>
                  {lastFetch.affiliateNetworkName}
                </li>
                <li>
                  <span className="font-medium">Best rate for users: </span>
                  {lastFetch.bestRatePercent}% ({lastFetch.currency})
                </li>
                <li>
                  <span className="font-medium">Tracking model: </span>
                  {lastFetch.trackingModel || "—"}
                </li>
                <li>
                  <span className="font-medium">Partner rates: </span>
                  {lastFetch.partnerRates?.length
                    ? lastFetch.partnerRates.join(" · ")
                    : "—"}
                </li>
              </ul>
              <p className="text-brand-800/80 dark:text-brand-200/80 mt-2 text-xs">
                Suggested app deeplink is filled below — edit if needed, then
                save.
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="commission-deeplink"
              className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              App deeplink for this brand
            </label>
            <input
              id="commission-deeplink"
              type="url"
              placeholder="https://gogocash.app/..."
              value={deeplinkDraft}
              onChange={(e) => setDeeplinkOverride(e.target.value)}
              className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-3 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This is the deep link users open in the app for this merchant
              after you optimize commission routing.
            </p>
          </div>

          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSaveDeeplink}
              disabled={!resolvedOfferId || saveDeeplink.isPending}
            >
              {saveDeeplink.isPending ? "Saving…" : "Save deeplink"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
