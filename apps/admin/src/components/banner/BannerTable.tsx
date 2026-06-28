"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import client, { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import FormUpdate from "./FormUpdate";
import { BANNER_ADMIN_SURFACES } from "@/lib/bannerAdminSurfaces";
import { getBannerSlotRowFields, getBannerTableStatusCell } from "@/lib/bannerSlotStatus";
import NoData from "@/components/common/NoData";
import { pathImage } from "@/utils/helper";
import { buildBannerClearSlotFormData, buildBannerSlotFormState } from "./bannerFormPayload";
import { type BannerRequestForm, type BannerTableVariant, type BannerSlotId, type BannerData } from "@/types/banner";
import { useDataSession } from "@/hooks/useDataSession";
import { usePermissions } from "@/hooks/usePermissions";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { devError } from "@/lib/devConsole";
import { multipartPostConfig } from "@/lib/multipartFormHeaders";

export type { BannerTableVariant } from "@/types/banner";

type HeaderNavMode = "fullHome" | "fullAllBrand" | "minimal";

const VARIANT_CONFIG: Record<
  BannerTableVariant,
  {
    queryKey: string[];
    fetchPath: string;
    savePath: string;
    tableTitle: string;
    tableSubtitle?: string;
    formTitle: string;
    formDescription: string;
    uploadHint: string;
    headerNavMode: HeaderNavMode;
  }
> = {
  home: {
    queryKey: BANNER_ADMIN_SURFACES.home.queryKey,
    fetchPath: BANNER_ADMIN_SURFACES.home.fetchPath,
    savePath: BANNER_ADMIN_SURFACES.home.fetchPath,
    tableTitle: "Home Page Banner",
    formTitle: "Banner Home",
    formDescription:
      "Edit homepage banner slot {slot}: upload an image, set the link and optional start/end dates. The banner is shown to users on the app homepage.",
    uploadHint:
      "Choose a banner image (e.g. PNG, JPG). Use a clear, wide image for best display on the homepage.",
    headerNavMode: "fullHome",
  },
  homeSmall: {
    queryKey: BANNER_ADMIN_SURFACES.homeSmall.queryKey,
    fetchPath: BANNER_ADMIN_SURFACES.homeSmall.fetchPath,
    savePath: BANNER_ADMIN_SURFACES.homeSmall.fetchPath,
    tableTitle: "Home Page Banner Small Banner",
    tableSubtitle: "Secondary strip on the home screen (below the main carousel). Same five slots; use smaller artwork in the app.",
    formTitle: "Home Page Banner — Small",
    formDescription:
      "Edit small-banner slot {slot} on the homepage: upload a compact image, set the link, and optional start/end dates.",
    uploadHint:
      "Smaller tiles or icons work well here (e.g. square or short-wide ratio), separate from the main hero banners.",
    headerNavMode: "minimal",
  },
  allBrand: {
    queryKey: BANNER_ADMIN_SURFACES.allBrand.queryKey,
    fetchPath: BANNER_ADMIN_SURFACES.allBrand.fetchPath,
    savePath: BANNER_ADMIN_SURFACES.allBrand.fetchPath,
    tableTitle: "All Brand Page banner",
    formTitle: "All Brand Page banner",
    formDescription:
      "Edit banner slot {slot} for the app’s all-brands listing: upload an image, set the link, and optional start/end dates.",
    uploadHint:
      "Choose a banner image (e.g. PNG, JPG). Wide assets work best at the top of the brands list.",
    headerNavMode: "fullAllBrand",
  },
};

type BannerTableProps = {
  variant?: BannerTableVariant;
};

export default function BannerTable({ variant = "home" }: BannerTableProps) {
  const cfg = VARIANT_CONFIG[variant];
  const session = useDataSession();
  const { can } = usePermissions();
  const canManageBanners = can("banner:manage");
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [clearingSlot, setClearingSlot] = useState<BannerSlotId | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<BannerRequestForm>({
    image_1: null,
    image_2: null,
    image_3: null,
    image_4: null,
    image_5: null,
    link_1: "",
    link_2: "",
    link_3: "",
    link_4: "",
    link_5: "",
    enabled_1: true,
    enabled_2: true,
    enabled_3: true,
    enabled_4: true,
    enabled_5: true,
    start_date_1: "",
    start_date_2: "",
    start_date_3: "",
    start_date_4: "",
    start_date_5: "",
    end_date_1: "",
    end_date_2: "",
    end_date_3: "",
    end_date_4: "",
    end_date_5: "",
    end_forever_1: true,
    end_forever_2: true,
    end_forever_3: true,
    end_forever_4: true,
    end_forever_5: true,
    id: "",
  });

  const [tableSearch, setTableSearch] = useState("");

  const {
    data: bannerData,
    refetch,
    isLoading: isLoadingBanner,
  } = useQuery<BannerData>({
    queryKey: cfg.queryKey,
    queryFn: () => fetcher(cfg.fetchPath),
  });
  const visibleSlots = useMemo(() => {
    const needle = tableSearch.trim().toLowerCase();
    const all = [1, 2, 3, 4, 5] as const;
    if (!needle) return [...all];
    return all.filter((slot) => {
      const { imageId, link } = getBannerSlotRowFields(bannerData, slot);
      const idStr = String(imageId ?? "").toLowerCase();
      return (
        String(slot).includes(needle) ||
        link.toLowerCase().includes(needle) ||
        idStr.includes(needle)
      );
    });
  }, [bannerData, tableSearch]);

  useEffect(() => {
    if (!openActionsId) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (actionsDropdownRef.current?.contains(e.target as Node)) return;
      setOpenActionsId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openActionsId]);

  const rowActionKey = (slot: number) => `${variant}-banner-${slot}`;

  const handleEditSlot = useCallback(
    (slot: BannerSlotId) => {
      setOpenActionsId(null);
      setForm(buildBannerSlotFormState(bannerData, slot));
      setOpenModal(true);
    },
    [bannerData],
  );

  const handleClearSlot = useCallback(async (slot: BannerSlotId) => {
    if (!canManageBanners) {
      toast.error("You do not have permission to clear banner slots.");
      return;
    }
    const confirmed = window.confirm(
      `Clear banner slot ${slot}? This removes the image, link, and schedule for this position.`,
    );
    if (!confirmed) return;

    setOpenActionsId(null);
    setClearingSlot(slot);
    try {
      await client.post(
        cfg.savePath,
        buildBannerClearSlotFormData(slot),
        multipartPostConfig(session?.accessToken),
      );
      await refetch();
      toast.success(`Slot ${slot} cleared`);
    } catch (err: unknown) {
      devError("Banner clear failed:", err);
      toast.error(getApiErrorMessage(err, "Failed to clear slot"));
    } finally {
      setClearingSlot(null);
    }
  }, [canManageBanners, cfg.savePath, refetch, session]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <FormUpdate
        fetchData={refetch}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        savePath={cfg.savePath}
        headerTitle={cfg.formTitle}
        headerDescription={cfg.formDescription}
        uploadImageHint={cfg.uploadHint}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{cfg.tableTitle}</h3>
          {cfg.tableSubtitle ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{cfg.tableSubtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {cfg.headerNavMode === "fullHome" ? (
            <Link
              href="/banner/all-brand-page"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              All Brand Page banner
            </Link>
          ) : null}
          {cfg.headerNavMode === "fullAllBrand" ? (
            <Link
              href="/banner"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Home Page Banner
            </Link>
          ) : null}
          {cfg.headerNavMode === "fullHome" || cfg.headerNavMode === "fullAllBrand" ? (
            <>
              <Link
                href="/banner/modal-popups"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Modal popups
              </Link>
              <Link
                href="/banner/popup-history"
                className="inline-flex items-center justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30"
              >
                Popup history
              </Link>
            </>
          ) : null}
          <input
            type="search"
            placeholder="Search slots, links, image id…"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
            aria-label="Filter banner rows"
          />
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {isLoadingBanner ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : (
          <>
            {/* Banner Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <caption className="sr-only">{cfg.tableTitle} — five slots</caption>
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Image
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Link
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {visibleSlots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6">
                        <NoData>No rows match your search.</NoData>
                      </td>
                    </tr>
                  ) : (
                  visibleSlots.map((item) => {
                    const { imageId, link, hasSlotContent, enabled, startDate, endDate } =
                      getBannerSlotRowFields(bannerData, item);
                    const imageSrc = imageId
                      ? pathImage(imageId) ||
                        `https://placehold.co/96x96.png/e2e8f0/64748b?text=Banner+${item}`
                      : null;
                    const statusCell = getBannerTableStatusCell({
                      hasSlotContent,
                      enabled,
                      start_date: startDate,
                      end_date: endDate,
                    });
                    const actionKey = rowActionKey(item);

                    return (
                      <tr
                        key={item}
                        title="Click row for quick view"
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleEditSlot(item)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {imageSrc ? (
                            <RemoteOrBlobImage
                              className="h-14 w-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                              src={imageSrc}
                              alt={link || `Banner ${item}`}
                              width={80}
                              height={56}
                            />
                          ) : (
                            <span className="inline-flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              No image
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 min-w-0 max-w-md">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="truncate text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {link}
                            </a>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {statusCell.kind === "live" ? (
                            <span className={statusCell.badgeClass}>{statusCell.label}</span>
                          ) : (
                            <span
                              className="text-gray-400 dark:text-gray-500"
                              title="Inactive slots are listed on Popup history"
                              aria-label="Inactive; see Popup history page"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td
                          className="relative px-6 py-4 text-sm font-medium whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div
                            ref={openActionsId === actionKey ? actionsDropdownRef : undefined}
                            className="relative inline-block"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionsId((prev) => (prev === actionKey ? null : actionKey));
                              }}
                              className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-expanded={openActionsId === actionKey}
                              aria-haspopup="true"
                            >
                              Actions
                              <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openActionsId === actionKey && (
                              <div
                                className="absolute left-0 right-auto top-full z-50 mt-1 min-w-[10rem] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 sm:left-auto sm:right-0 sm:max-w-none"
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSlot(item);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={!canManageBanners || clearingSlot === item}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleClearSlot(item);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  {clearingSlot === item ? "Clearing…" : "Clear"}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Status shows <span className="font-medium text-gray-600 dark:text-gray-300">Active</span> or{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">Scheduled</span> only. Empty or past-end slots are{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">inactive</span> — see them under{" "}
              <Link href="/banner/popup-history" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                Popup history
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
