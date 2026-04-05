"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Offer } from "@/types/api";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import { pathImage } from "@/utils/helper";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import Button from "@/components/ui/button/Button";
import { ArrowDownIcon, ArrowUpIcon } from "@/icons/index";
import toast from "react-hot-toast";
import { OFFER_THUMB_SIZES } from "./offerMedia";

const TOP_BRANDS_QUERY_KEY = ["admin", "top-brands"] as const;

const EMPTY_ORDER: string[] = [];

/** Payload for HTML5 DnD (index into the ordered id list). */
const DND_INDEX_KEY = "application/gogocash-top-brand-index";

function reorderIds(ids: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex) return ids;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) {
    return ids;
  }
  const next = [...ids];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

function DragRowGrip() {
  return (
    <span
      className="flex shrink-0 flex-col justify-center gap-0.5 text-gray-400 select-none"
      aria-hidden
    >
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
    </span>
  );
}

function offerLabel(o: Offer): string {
  return (o.offer_name_display || o.offer_name || o._id).trim();
}

function ordersEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export default function TopBrandManagementPanel() {
  const queryClient = useQueryClient();
  /** When non-null, unsaved edits; otherwise show server order from `data`. */
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [addOfferId, setAddOfferId] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: TOP_BRANDS_QUERY_KEY,
    queryFn: () => apiClient.getTopBrands(),
  });

  const serverOrder = useMemo(() => data?.order ?? EMPTY_ORDER, [data?.order]);
  const localOrder = draftOrder ?? serverOrder;

  const pickerQuery = useMemo(
    () => ({
      search: pickerSearch.trim(),
      page: 1,
      limit: 80,
      country: "",
    }),
    [pickerSearch],
  );

  const { data: offersPick } = useQuery({
    queryKey: offersListQueryKey(pickerQuery),
    queryFn: () => fetchOffersList(pickerQuery),
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

  const pickerOptions = useMemo(() => {
    const inList = new Set(localOrder);
    return (offersPick?.data ?? []).filter((o) => !inList.has(o._id));
  }, [offersPick?.data, localOrder]);

  const dirty =
    draftOrder !== null && !ordersEqual(draftOrder, serverOrder);

  const saveMutation = useMutation({
    mutationFn: (order: string[]) => apiClient.saveTopBrands(order),
    onSuccess: () => {
      setDraftOrder(null);
      void queryClient.invalidateQueries({ queryKey: TOP_BRANDS_QUERY_KEY });
      toast.success("Top brand order saved.");
    },
    onError: () => {
      toast.error("Could not save top brand order.");
    },
  });

  const move = useCallback(
    (from: number, to: number) => {
      setDraftOrder((d) => {
        const prev = d ?? serverOrder;
        if (to < 0 || to >= prev.length) return d;
        return reorderIds(prev, from, to);
      });
    },
    [serverOrder],
  );

  const removeAt = useCallback((index: number) => {
    setDraftOrder((d) => {
      const prev = d ?? serverOrder;
      return prev.filter((_, i) => i !== index);
    });
  }, [serverOrder]);

  const addSelected = useCallback(() => {
    const id = addOfferId.trim();
    if (!id) return;
    setDraftOrder((d) => {
      const prev = d ?? serverOrder;
      return prev.includes(id) ? prev : [...prev, id];
    });
    setAddOfferId("");
  }, [addOfferId, serverOrder]);

  const handleRowDragStart = useCallback((e: DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.setData(DND_INDEX_KEY, String(index));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleRowDragEnd = useCallback(() => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleRowDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleRowDragLeave = useCallback((e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOverIndex(null);
  }, []);

  const handleRowDrop = useCallback(
    (e: DragEvent, dropIndex: number) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(DND_INDEX_KEY) || e.dataTransfer.getData("text/plain");
      const from = parseInt(raw, 10);
      setDraggingIndex(null);
      setDragOverIndex(null);
      if (Number.isNaN(from)) return;
      setDraftOrder((d) => {
        const prev = d ?? serverOrder;
        return reorderIds(prev, from, dropIndex);
      });
    },
    [serverOrder],
  );

  if (isLoading && !data) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-7 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-6 h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        {error instanceof Error ? error.message : "Failed to load top brands."}
      </div>
    );
  }

  const staleIds = localOrder.filter((id) => !offerById.has(id));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-3xl space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Homepage top brands</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose which offers appear in the app homepage top-brand section and set their display order (first =
          leftmost / top). In mock mode this is stored in memory until you restart the dev server.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tip: you can still flag individual offers with <strong className="font-medium">Top Brands</strong> on
          each offer; this screen controls the curated homepage sequence consumers see.
        </p>
      </div>

      {staleIds.length > 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Unknown or unloaded offer IDs: {staleIds.join(", ")}. Save will drop IDs that do not exist in the
          catalog.
        </p>
      )}

      <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add offer</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Search by name, then pick an offer. Already listed offers are hidden.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="top-brand-search" className="sr-only">
              Search offers
            </label>
            <input
              id="top-brand-search"
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search offers…"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400"
            />
          </div>
          <div className="min-w-0 flex-[2]">
            <label htmlFor="top-brand-add" className="sr-only">
              Select offer to add
            </label>
            <select
              id="top-brand-add"
              value={addOfferId}
              onChange={(e) => setAddOfferId(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400"
            >
              <option value="">Select an offer…</option>
              {pickerOptions.map((o) => (
                <option key={o._id} value={o._id}>
                  {offerLabel(o)}
                  {o.disabled ? " (disabled)" : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" size="sm" onClick={addSelected} disabled={!addOfferId}>
            Add to list
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Current order</h3>
        {localOrder.length > 0 ? (
          <p id="top-brand-dnd-help" className="text-xs text-gray-500 dark:text-gray-400">
            Press, hold briefly, and drag a row to a new spot (or drag from the grip). You can also use the
            arrow buttons. Touch devices may need the arrows.
          </p>
        ) : null}
        {localOrder.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No brands selected yet. Use the form above to add offers.
          </p>
        ) : null}
        <ul className="space-y-2" aria-describedby={localOrder.length > 0 ? "top-brand-dnd-help" : undefined}>
          {localOrder.map((id, index) => {
            const offer = offerById.get(id);
            const isDragging = draggingIndex === index;
            const isDropTarget =
              dragOverIndex === index && draggingIndex !== null && draggingIndex !== index;
            return (
              <li
                key={id}
                draggable
                aria-grabbed={isDragging ? true : undefined}
                onDragStart={(e) => handleRowDragStart(e, index)}
                onDragEnd={handleRowDragEnd}
                onDragOver={(e) => handleRowDragOver(e, index)}
                onDragLeave={handleRowDragLeave}
                onDrop={(e) => handleRowDrop(e, index)}
                className={`flex flex-wrap items-center gap-3 rounded-xl border bg-gray-50/80 px-3 py-2.5 transition-[opacity,box-shadow] dark:bg-gray-900/40 ${
                  isDragging
                    ? "cursor-grabbing border-gray-200 opacity-60 dark:border-gray-700"
                    : "cursor-grab border-gray-200 dark:border-gray-700"
                } ${
                  isDropTarget
                    ? "border-brand-400 ring-2 ring-brand-400/40 dark:border-brand-500"
                    : ""
                }`}
              >
                <span
                  className="inline-flex shrink-0 cursor-grab touch-none items-center rounded-md px-1 py-1 text-gray-400 hover:bg-gray-200/80 active:cursor-grabbing dark:hover:bg-gray-700/80"
                  title="Drag to reorder"
                >
                  <DragRowGrip />
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                  {index + 1}
                </span>
                {offer ? (
                  <RemoteOrBlobImage
                    src={pathImage(offer.logo_circle || offer.logo_desktop || offer.logo_mobile)}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-0.5 dark:bg-gray-800"
                    sizes={OFFER_THUMB_SIZES}
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    ?
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {offer ? offerLabel(offer) : "Unknown offer"}
                  </p>
                  <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">{id}</p>
                </div>
                {offer?.disabled ? (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    Disabled
                  </span>
                ) : null}
                {offer?.extra_store ? (
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
                    Top Brands on
                  </span>
                ) : null}
                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    title="Move up"
                    draggable={false}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    draggable={false}
                    disabled={index >= localOrder.length - 1}
                    onClick={() => move(index, index + 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                  >
                    <ArrowDownIcon />
                  </button>
                  <button
                    type="button"
                    title="Remove from homepage list"
                    draggable={false}
                    onClick={() => removeAt(index)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          type="button"
          size="sm"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate(localOrder)}
        >
          {saveMutation.isPending ? "Saving…" : "Save order"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => setDraftOrder(null)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
