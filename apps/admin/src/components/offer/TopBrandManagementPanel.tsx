"use client";

import { useCallback, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePermissions } from "@/hooks/usePermissions";
import type { Offer, TopBrandConfigEntry } from "@/types/api";
import {
  brandSearchOptionLabel,
  getOfferDisplayName,
} from "@/lib/offerDisplay";
import {
  mergeAutocompleteTextFieldSlotProps,
  offerAutocompletePopperSlotProps,
  partitionOffersByIdPresence,
  syncAutocompleteSearchInput,
} from "@/lib/offerAutocompleteUi";
import { isActiveGoGoCashOffer } from "@/lib/isActiveGoGoCashOffer";
import { resolveTopBrandCashbackLabel } from "@/lib/offerDeeplink";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import Button from "@/components/ui/button/Button";
import toast from "react-hot-toast";
import TopBrandLandingPreview from "./TopBrandLandingPreview";

const TOP_BRANDS_QUERY_KEY = ["admin", "top-brands"] as const;
const PICKER_RESULTS_LIMIT = 100;

const EMPTY_BRANDS: TopBrandConfigEntry[] = [];

function reorderIds(
  ids: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex === toIndex) return ids;
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length
  ) {
    return ids;
  }
  const next = [...ids];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

function offerLabel(o: Offer): string {
  return getOfferDisplayName(o);
}

function offerPickerLabel(o: Offer): string {
  return brandSearchOptionLabel(o);
}

function ordersEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export default function TopBrandManagementPanel() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManageBrands = can("brands:manage");
  /** When non-null, unsaved edits for that device; otherwise use server order. */
  const [draftOrderDesktop, setDraftOrderDesktop] = useState<string[] | null>(
    null,
  );
  const [draftOrderMobile, setDraftOrderMobile] = useState<string[] | null>(
    null,
  );
  const [pickerSearch, setPickerSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: TOP_BRANDS_QUERY_KEY,
    queryFn: () => apiClient.getTopBrands(),
  });

  const serverOrderDesktop = useMemo(
    () =>
      data?.orderDesktop ??
      data?.order ??
      (data?.brandsDesktop ?? data?.brands ?? EMPTY_BRANDS).map(
        (entry) => entry.offerId,
      ),
    [data?.brands, data?.brandsDesktop, data?.order, data?.orderDesktop],
  );
  const serverOrderMobile = useMemo(
    () =>
      data?.orderMobile ??
      data?.order ??
      (data?.brandsMobile ?? data?.brands ?? EMPTY_BRANDS).map(
        (entry) => entry.offerId,
      ),
    [data?.brands, data?.brandsMobile, data?.order, data?.orderMobile],
  );
  const localOrderDesktop = draftOrderDesktop ?? serverOrderDesktop;
  const localOrderMobile = draftOrderMobile ?? serverOrderMobile;
  const localOrder = useMemo(
    () => [...new Set([...localOrderDesktop, ...localOrderMobile])],
    [localOrderDesktop, localOrderMobile],
  );
  const maxBrands = data?.maxBrands ?? 16;

  const pickerQuery = useMemo(
    () => ({
      search: pickerSearch.trim(),
      page: 1,
      limit: PICKER_RESULTS_LIMIT,
      country: "",
    }),
    [pickerSearch],
  );

  const {
    data: offersPick,
    isFetching: offersPickLoading,
    isError: offersPickError,
    error: offersPickQueryError,
  } = useQuery({
    queryKey: offersListQueryKey(pickerQuery),
    queryFn: () => fetchOffersList(pickerQuery),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const offerById = useMemo(() => {
    const m = new Map<string, Offer>();
    for (const o of data?.items ?? []) {
      m.set(o._id, o);
    }
    for (const o of offersPick?.data ?? []) {
      if (!m.has(o._id)) m.set(o._id, o);
    }
    return m;
  }, [data?.items, offersPick?.data]);
  // #479 — drop known-disabled / pending / rejected offers from the curated
  // lists so Landing preview and Save never keep them as Top brands.
  const orderDesktop = useMemo(
    () =>
      localOrderDesktop.filter((id) => {
        const offer = offerById.get(id);
        return !offer || isActiveGoGoCashOffer(offer);
      }),
    [localOrderDesktop, offerById],
  );
  const orderMobile = useMemo(
    () =>
      localOrderMobile.filter((id) => {
        const offer = offerById.get(id);
        return !offer || isActiveGoGoCashOffer(offer);
      }),
    [localOrderMobile, offerById],
  );
  const orderUnique = useMemo(
    () => [...new Set([...orderDesktop, ...orderMobile])],
    [orderDesktop, orderMobile],
  );
  const disabledListedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of localOrder) {
      const offer = offerById.get(id);
      if (offer && !isActiveGoGoCashOffer(offer)) ids.add(id);
    }
    return [...ids];
  }, [localOrder, offerById]);

  const brandsDesktop = useMemo(
    () =>
      orderDesktop.map((offerId) => ({
        offerId,
        cashback: resolveTopBrandCashbackLabel(offerById.get(offerId), ""),
      })),
    [orderDesktop, offerById],
  );
  const brandsMobile = useMemo(
    () =>
      orderMobile.map((offerId) => ({
        offerId,
        cashback: resolveTopBrandCashbackLabel(offerById.get(offerId), ""),
      })),
    [orderMobile, offerById],
  );

  const listedOfferIds = useMemo(() => new Set(orderUnique), [orderUnique]);

  const eligiblePickerOffers = useMemo(
    () => (offersPick?.data ?? []).filter(isActiveGoGoCashOffer),
    [offersPick?.data],
  );

  const { available: pickerOptions, hidden: hiddenPickerMatches } = useMemo(
    () => partitionOffersByIdPresence(eligiblePickerOffers, listedOfferIds),
    [eligiblePickerOffers, listedOfferIds],
  );

  const pickerNoOptionsText = useMemo(() => {
    if (offersPickLoading) return "Loading offers…";
    if (offersPickError) return "Couldn't load offers. Please try again.";
    if (hiddenPickerMatches.length > 0 && pickerSearch.trim()) {
      const noun =
        hiddenPickerMatches.length === 1 ? "offer is" : "offers are";
      return `${hiddenPickerMatches.length} matching ${noun} already in the homepage list below`;
    }
    return "No matching offers found";
  }, [
    hiddenPickerMatches.length,
    offersPickError,
    offersPickLoading,
    pickerSearch,
  ]);

  const dirty =
    !ordersEqual(orderDesktop, serverOrderDesktop) ||
    !ordersEqual(orderMobile, serverOrderMobile) ||
    disabledListedIds.length > 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.saveTopBrands({
        brandsDesktop,
        brandsMobile,
      }),
    onSuccess: () => {
      setDraftOrderDesktop(null);
      setDraftOrderMobile(null);
      void queryClient.invalidateQueries({ queryKey: TOP_BRANDS_QUERY_KEY });
      toast.success("Top brands saved.");
    },
    onError: (err) => {
      toast.error(
        getApiErrorMessage(
          err,
          "Couldn't save the top brands. Please try again, or contact an administrator if it continues.",
        ),
      );
    },
  });

  const removeOffer = useCallback(
    (offerId: string) => {
      setDraftOrderDesktop((d) =>
        (d ?? serverOrderDesktop).filter((id) => id !== offerId),
      );
      setDraftOrderMobile((d) =>
        (d ?? serverOrderMobile).filter((id) => id !== offerId),
      );
    },
    [serverOrderDesktop, serverOrderMobile],
  );

  const addOfferFromPicker = useCallback(
    (offer: Offer) => {
      const id = offer._id.trim();
      if (!id) return;
      // #479 — disabled / non-active offers cannot become Top brands.
      if (!isActiveGoGoCashOffer(offer)) {
        toast.error("Disabled offers cannot be added as top brands.");
        return;
      }
      let blocked = false;
      setDraftOrderDesktop((d) => {
        const prev = d ?? serverOrderDesktop;
        if (prev.includes(id)) return prev;
        if (prev.length >= maxBrands) {
          blocked = true;
          return prev;
        }
        return [...prev, id];
      });
      setDraftOrderMobile((d) => {
        const prev = d ?? serverOrderMobile;
        if (prev.includes(id)) return prev;
        if (prev.length >= maxBrands) {
          blocked = true;
          return prev;
        }
        return [...prev, id];
      });
      if (blocked) {
        toast.error(`You can select up to ${maxBrands} top brands per device.`);
      }
    },
    [maxBrands, serverOrderDesktop, serverOrderMobile],
  );

  const handlePreviewReorder = useCallback(
    (device: "desktop" | "mobile", from: number, to: number) => {
      if (device === "desktop") {
        setDraftOrderDesktop((d) =>
          reorderIds(d ?? serverOrderDesktop, from, to),
        );
      } else {
        setDraftOrderMobile((d) =>
          reorderIds(d ?? serverOrderMobile, from, to),
        );
      }
    },
    [serverOrderDesktop, serverOrderMobile],
  );

  if (isLoading && !data) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-7 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-6 h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  const staleIds = localOrder.filter((id) => !offerById.has(id));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* #278: a failed load must not blank the whole panel — surface the
          error and keep the picker + order list interactive. */}
      {isError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {getApiErrorMessage(error, "Could not load top brands.")}
        </div>
      ) : null}
      <div className="max-w-3xl space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Homepage top brands
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose which offers appear in the app homepage top-brand section and
          set their display order (first = leftmost / top). In mock mode this is
          stored in memory until you restart the dev server.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tip: you can still flag individual offers with{" "}
          <strong className="font-medium">Top Brands</strong> on each offer;
          this screen controls the curated homepage sequence consumers see.
        </p>
        {!canManageBrands ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            You have read-only access. Ask an admin with Brands Management
            permission to change homepage top brands.
          </p>
        ) : null}
      </div>

      {staleIds.length > 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Unknown or unloaded offer IDs: {staleIds.join(", ")}. Save will drop
          IDs that do not exist in the catalog.
        </p>
      )}
      {disabledListedIds.length > 0 ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
        >
          Disabled offers are excluded from Top brands and will be removed on
          Save:{" "}
          {disabledListedIds
            .map((id) => {
              const offer = offerById.get(id);
              return offer ? offerLabel(offer) : id;
            })
            .join(", ")}
          .
        </p>
      ) : null}

      <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Add offer
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Click to browse recent offers or type to search by brand name, country,
          lookup slug, offer id, or Mongo id. Offers already in the list below
          are hidden. Disabled offers are not selectable.
        </p>
        <div className="mt-3">
          <Autocomplete
            id="top-brand-add"
            disabled={!canManageBrands || orderUnique.length >= maxBrands}
            options={pickerOptions}
            value={null}
            inputValue={pickerSearch}
            loading={offersPickLoading}
            openOnFocus
            filterOptions={(items) => items}
            getOptionLabel={(offer) => offerPickerLabel(offer)}
            getOptionKey={(offer) => offer._id}
            isOptionEqualToValue={(left, right) => left._id === right._id}
            noOptionsText={pickerNoOptionsText}
            slotProps={offerAutocompletePopperSlotProps}
            sx={{ width: "100%" }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search offers to add…"
                slotProps={mergeAutocompleteTextFieldSlotProps(
                  params,
                  "Search offers to add",
                )}
              />
            )}
            renderOption={(props, offer) => {
              const { key: _key, ...optionProps } = props;
              return (
                <li {...optionProps} key={offer._id}>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{offerLabel(offer)}</span>
                    <span className="truncate text-xs text-gray-500">
                      {offerPickerLabel(offer)}
                    </span>
                  </div>
                </li>
              );
            }}
            onInputChange={(_event, value, reason) => {
              syncAutocompleteSearchInput(reason, value, setPickerSearch);
            }}
            onChange={(_event, offer) => {
              if (!offer) return;
              addOfferFromPicker(offer);
              setPickerSearch("");
            }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Top brands selected: {orderUnique.length} unique / {maxBrands} per
          device (desktop {orderDesktop.length}, mobile {orderMobile.length})
        </p>
        {hiddenPickerMatches.length > 0 && pickerSearch.trim() ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {hiddenPickerMatches.length} matching offer
            {hiddenPickerMatches.length === 1 ? "" : "s"} already in the
            homepage list below. Remove one from the list to re-add a different
            variant, or search by country / offer id.
          </p>
        ) : null}
        {offersPickError ? (
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">
            {getApiErrorMessage(
              offersPickQueryError,
              "Could not search offers. Check your admin session and API connection.",
            )}
          </p>
        ) : null}
      </div>

      <TopBrandLandingPreview
        orderDesktop={orderDesktop}
        orderMobile={orderMobile}
        canEdit={canManageBrands}
        onReorder={handlePreviewReorder}
        onRemove={removeOffer}
        labelFor={(offerId) => {
          const previewOffer = offerById.get(offerId);
          return previewOffer ? offerLabel(previewOffer) : offerId;
        }}
      />

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          type="button"
          size="sm"
          disabled={!canManageBrands || !dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving…" : "Save top brands"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canManageBrands || !dirty || saveMutation.isPending}
          onClick={() => {
            setDraftOrderDesktop(null);
            setDraftOrderMobile(null);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
