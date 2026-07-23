"use client";

import { useCallback, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePermissions } from "@/hooks/usePermissions";
import type { LandingRailAdmin, Offer } from "@/types/api";
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
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import Button from "@/components/ui/button/Button";
import toast from "react-hot-toast";
import TopBrandLandingPreview from "./TopBrandLandingPreview";

const LANDING_RAILS_QUERY_KEY = ["admin", "landing-rails"] as const;
const PICKER_RESULTS_LIMIT = 100;

/** Editable draft of one rail (identity + per-device order + presentation). */
type RailDraft = {
  railId: string;
  title: string;
  emoji: string;
  link: string;
  cardVariant: string;
  position: number;
  enabled: boolean;
  orderDesktop: string[];
  orderMobile: string[];
};

function reorderIds(ids: string[], fromIndex: number, toIndex: number): string[] {
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

function railFromServer(rail: LandingRailAdmin): RailDraft {
  return {
    railId: rail.railId,
    title: rail.title,
    emoji: rail.emoji,
    link: rail.link,
    cardVariant: rail.cardVariant || "brandLogoBadge",
    position: rail.position,
    enabled: rail.enabled,
    orderDesktop:
      rail.orderDesktop ?? rail.brandsDesktop.map((b) => b.offerId),
    orderMobile: rail.orderMobile ?? rail.brandsMobile.map((b) => b.offerId),
  };
}

type RailEditorProps = {
  rail: RailDraft;
  canEdit: boolean;
  maxBrands: number;
  offerById: Map<string, Offer>;
  registerOffers: (offers: readonly Offer[]) => void;
  onChange: (next: RailDraft) => void;
  onRemove: () => void;
};

/** Per-rail editor: presentation fields + a device-aware brand order preview. */
function RailEditor({
  rail,
  canEdit,
  maxBrands,
  offerById,
  registerOffers,
  onChange,
  onRemove,
}: RailEditorProps) {
  const [pickerSearch, setPickerSearch] = useState("");

  const pickerQuery = useMemo(
    () => ({ search: pickerSearch.trim(), page: 1, limit: PICKER_RESULTS_LIMIT, country: "" }),
    [pickerSearch],
  );

  const { data: offersPick, isFetching: offersPickLoading } = useQuery({
    queryKey: offersListQueryKey(pickerQuery),
    queryFn: () => fetchOffersList(pickerQuery),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const unique = useMemo(
    () => [...new Set([...rail.orderDesktop, ...rail.orderMobile])],
    [rail.orderDesktop, rail.orderMobile],
  );
  const listedIds = useMemo(() => new Set(unique), [unique]);

  const eligiblePickerOffers = useMemo(
    () => (offersPick?.data ?? []).filter(isActiveGoGoCashOffer),
    [offersPick?.data],
  );
  const { available: pickerOptions } = useMemo(
    () => partitionOffersByIdPresence(eligiblePickerOffers, listedIds),
    [eligiblePickerOffers, listedIds],
  );

  const addOffer = useCallback(
    (offer: Offer) => {
      const id = offer._id.trim();
      if (!id) return;
      if (!isActiveGoGoCashOffer(offer)) {
        toast.error("Disabled offers cannot be added to a rail.");
        return;
      }
      registerOffers([offer]);
      if (unique.length >= maxBrands && !listedIds.has(id)) {
        toast.error(`You can select up to ${maxBrands} brands per device.`);
        return;
      }
      onChange({
        ...rail,
        orderDesktop: rail.orderDesktop.includes(id)
          ? rail.orderDesktop
          : [...rail.orderDesktop, id],
        orderMobile: rail.orderMobile.includes(id)
          ? rail.orderMobile
          : [...rail.orderMobile, id],
      });
    },
    [listedIds, maxBrands, onChange, rail, registerOffers, unique.length],
  );

  const removeOffer = useCallback(
    (offerId: string) => {
      onChange({
        ...rail,
        orderDesktop: rail.orderDesktop.filter((id) => id !== offerId),
        orderMobile: rail.orderMobile.filter((id) => id !== offerId),
      });
    },
    [onChange, rail],
  );

  const handleReorder = useCallback(
    (device: "desktop" | "mobile", from: number, to: number) => {
      onChange(
        device === "desktop"
          ? { ...rail, orderDesktop: reorderIds(rail.orderDesktop, from, to) }
          : { ...rail, orderMobile: reorderIds(rail.orderMobile, from, to) },
      );
    },
    [onChange, rail],
  );

  const labelFor = useCallback(
    (offerId: string) => {
      const offer = offerById.get(offerId);
      return offer ? getOfferDisplayName(offer) : offerId;
    },
    [offerById],
  );

  const fieldClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {rail.title || rail.railId}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            railId: <code>{rail.railId}</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={rail.enabled}
              disabled={!canEdit}
              onChange={(e) => onChange({ ...rail, enabled: e.target.checked })}
            />
            Enabled
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canEdit}
            onClick={onRemove}
          >
            Remove rail
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Title
          <input
            className={fieldClass}
            value={rail.title}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...rail, title: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Emoji
          <input
            className={fieldClass}
            value={rail.emoji}
            disabled={!canEdit}
            maxLength={4}
            onChange={(e) => onChange({ ...rail, emoji: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
          "See all" link
          <input
            className={fieldClass}
            value={rail.link}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...rail, link: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Order (position)
          <input
            className={fieldClass}
            type="number"
            value={rail.position}
            disabled={!canEdit}
            onChange={(e) =>
              onChange({ ...rail, position: Number(e.target.value) || 0 })
            }
          />
        </label>
      </div>

      <div className="mt-4">
        <Autocomplete
          id={`landing-rail-add-${rail.railId}`}
          disabled={!canEdit || unique.length >= maxBrands}
          options={pickerOptions}
          value={null}
          inputValue={pickerSearch}
          loading={offersPickLoading}
          openOnFocus
          filterOptions={(items) => items}
          getOptionLabel={(offer) => brandSearchOptionLabel(offer)}
          getOptionKey={(offer) => offer._id}
          isOptionEqualToValue={(left, right) => left._id === right._id}
          slotProps={offerAutocompletePopperSlotProps}
          sx={{ width: "100%" }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search offers to add to this rail…"
              slotProps={mergeAutocompleteTextFieldSlotProps(
                params,
                "Search offers to add to this rail",
              )}
            />
          )}
          renderOption={(props, offer) => {
            const { key: _key, ...optionProps } = props;
            return (
              <li {...optionProps} key={offer._id}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{getOfferDisplayName(offer)}</span>
                  <span className="truncate text-xs text-gray-500">
                    {brandSearchOptionLabel(offer)}
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
            addOffer(offer);
            setPickerSearch("");
          }}
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Brands: {unique.length} unique / {maxBrands} per device (desktop{" "}
          {rail.orderDesktop.length}, mobile {rail.orderMobile.length})
        </p>
      </div>

      <TopBrandLandingPreview
        orderDesktop={rail.orderDesktop}
        orderMobile={rail.orderMobile}
        canEdit={canEdit}
        onReorder={handleReorder}
        onRemove={removeOffer}
        labelFor={labelFor}
      />
    </div>
  );
}

export default function LandingRailsManagementPanel() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManageBrands = can("brands:manage");

  const [draft, setDraft] = useState<RailDraft[] | null>(null);
  const [extraOffers, setExtraOffers] = useState<Map<string, Offer>>(
    () => new Map(),
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: LANDING_RAILS_QUERY_KEY,
    queryFn: () => apiClient.getLandingRails(),
  });

  const serverRails = useMemo(
    () => (data?.rails ?? []).map(railFromServer),
    [data?.rails],
  );
  const rails = draft ?? serverRails;
  const maxRails = data?.maxRails ?? 12;
  const maxBrands = data?.maxBrands ?? 16;

  const offerById = useMemo(() => {
    const m = new Map<string, Offer>();
    for (const o of data?.items ?? []) m.set(o._id, o);
    for (const [id, o] of extraOffers) if (!m.has(id)) m.set(id, o);
    return m;
  }, [data?.items, extraOffers]);

  const registerOffers = useCallback((offers: readonly Offer[]) => {
    setExtraOffers((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const o of offers) {
        if (!next.has(o._id)) {
          next.set(o._id, o);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const dirty = draft !== null;

  const updateRail = useCallback(
    (index: number, next: RailDraft) => {
      setDraft((current) => {
        const base = current ?? serverRails;
        return base.map((rail, i) => (i === index ? next : rail));
      });
    },
    [serverRails],
  );

  const removeRail = useCallback(
    (index: number) => {
      setDraft((current) => (current ?? serverRails).filter((_, i) => i !== index));
    },
    [serverRails],
  );

  const addRail = useCallback(() => {
    setDraft((current) => {
      const base = current ?? serverRails;
      if (base.length >= maxRails) {
        toast.error(`You can create up to ${maxRails} rails.`);
        return base;
      }
      const suffix = base.length + 1;
      return [
        ...base,
        {
          railId: `rail-${suffix}`,
          title: "",
          emoji: "",
          link: "",
          cardVariant: "brandLogoBadge",
          position: base.length,
          enabled: true,
          orderDesktop: [],
          orderMobile: [],
        },
      ];
    });
  }, [maxRails, serverRails]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.saveLandingRails({
        rails: rails.map((rail) => ({
          railId: rail.railId,
          title: rail.title,
          emoji: rail.emoji,
          link: rail.link,
          cardVariant: rail.cardVariant,
          position: rail.position,
          enabled: rail.enabled,
          brandsDesktop: rail.orderDesktop.map((offerId) => ({
            offerId,
            cashback: "",
          })),
          brandsMobile: rail.orderMobile.map((offerId) => ({
            offerId,
            cashback: "",
          })),
        })),
      }),
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: LANDING_RAILS_QUERY_KEY });
      toast.success("Landing rails saved.");
    },
    onError: (err) => {
      toast.error(
        getApiErrorMessage(
          err,
          "Couldn't save the landing rails. Please try again, or contact an administrator if it continues.",
        ),
      );
    },
  });

  if (isLoading && !data) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-7 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-6 h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {isError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {getApiErrorMessage(error, "Could not load landing rails.")}
        </div>
      ) : null}

      <div className="max-w-3xl space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Homepage landing rails
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Curate the homepage brand rails ("Trending Brands", "Travel Deals are
          Here!", "Makeup Must Have!"). Set each rail's title, emoji, "see all"
          link, order, and which offers appear — with independent desktop and
          mobile ordering. Empty rails fall back to the app fixture.
        </p>
        {!canManageBrands ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            You have read-only access. Ask an admin with Brands Management
            permission to change landing rails.
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        {rails.map((rail, index) => (
          <RailEditor
            key={rail.railId}
            rail={rail}
            canEdit={canManageBrands}
            maxBrands={maxBrands}
            offerById={offerById}
            registerOffers={registerOffers}
            onChange={(next) => updateRail(index, next)}
            onRemove={() => removeRail(index)}
          />
        ))}
        {rails.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No rails configured yet. Add one to start curating the homepage.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canManageBrands || rails.length >= maxRails}
          onClick={addRail}
        >
          Add rail
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canManageBrands || !dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving…" : "Save landing rails"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canManageBrands || !dirty || saveMutation.isPending}
          onClick={() => setDraft(null)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
