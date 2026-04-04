"use client";

import Input from "@/components/common/Input";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import TrendingIcon from "@/components/icons/TrendingIcon";
import { IResponseOffer } from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import Search from "@mui/icons-material/Search";
import { Box, Divider, InputAdornment, Popper } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { trackMerchantSearch } from "@/lib/analytics";
import HeaderSearchPopperRow from "./HeaderSearchPopperRow";
import { useTranslations } from "next-intl";

const TRENDING_LIMIT = 5;
const SEARCH_LIMIT = 5;
/** Header popper: refresh periodically instead of caching forever. */
const STALE_MS_TRENDING = 5 * 60 * 1000;
const STALE_MS_SEARCH = 60 * 1000;

export type SearchShopVariant = "header" | "homeMobile";

export interface SearchShopProps {
  /** `header`: desktop nav only (hidden below lg). `homeMobile`: home hero strip only (hidden from lg up). */
  variant?: SearchShopVariant;
}

const SearchShop = ({ variant = "header" }: SearchShopProps) => {
  const t = useTranslations();
  const isHomeMobile = variant === "homeMobile";
  const trendingListId = isHomeMobile ? "home_hero_trending_stores" : "header_trending_stores";
  const trendingListName = isHomeMobile ? "Home Hero Trending Stores" : "Header Trending Stores";
  const searchListId = isHomeMobile ? "home_hero_store_search" : "header_store_search";
  const searchListName = isHomeMobile ? "Home Hero Store Search" : "Header Store Search";
  const analyticsSource = isHomeMobile ? "home_hero_search" : "header_search";
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback((event: React.FocusEvent<HTMLElement>) => {
    /** Anchor the popper to the full TextField control (same width as `max-w-[560px]` row). */
    setAnchorEl((triggerRef.current ?? event.currentTarget) as HTMLElement);
  }, []);

  const open = Boolean(anchorEl);
  const popperId = open
    ? isHomeMobile
      ? "home-hero-search-popper"
      : "header-search-popper"
    : undefined;

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popperRef.current &&
        !popperRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, handleClose]);

  const [offerSearch, setSearch] = useState({
    category: "",
    page: 1,
    limit: SEARCH_LIMIT,
    search: "",
  });

  const hasQuery = offerSearch.search.trim().length > 0;

  const { data: trendingOffers } = useQuery<IResponseOffer>({
    queryKey: ["getOffer", "headerSearchTrending"],
    queryFn: () => fetcher(`/offer?category=&search=&limit=${TRENDING_LIMIT}&page=1`),
    staleTime: STALE_MS_TRENDING,
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: searchOffers } = useQuery<IResponseOffer>({
    queryKey: ["getOffer", "headerSearchQuery", offerSearch],
    queryFn: () =>
      fetcher(
        `/offer?category=${offerSearch.category}&search=${encodeURIComponent(offerSearch.search)}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: STALE_MS_SEARCH,
    enabled: open && hasQuery,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const searchEventRef = useRef("");

  useEffect(() => {
    const searchTerm = offerSearch.search.trim();
    if (!searchOffers || !searchTerm) return;

    const signature = [searchTerm, searchOffers.data.length].join("|");
    if (searchEventRef.current === signature) return;
    searchEventRef.current = signature;

    trackMerchantSearch({
      searchTerm,
      resultsCount: searchOffers.data.length,
      listId: searchListId,
      listName: searchListName,
    });
  }, [offerSearch.search, searchOffers, searchListId, searchListName]);

  const trendingList = trendingOffers?.data ?? [];
  const matchList = searchOffers?.data ?? [];

  const [popperWidthPx, setPopperWidthPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const measure = () => setPopperWidthPx(anchorEl.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(anchorEl);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [anchorEl]);

  const inputVisibilityClass =
    variant === "homeMobile"
      ? "w-full max-w-none lg:hidden"
      : "w-full max-w-[560px] lg:block hidden";

  const homeMobileInputSx = isHomeMobile
    ? {
        " .MuiOutlinedInput-root": {
          minHeight: 52,
        },
        " .MuiInputBase-input": {
          fontSize: "16px",
        },
      }
    : undefined;

  const searchField = (
    <Input
      ref={triggerRef}
      onFocus={handleOpen}
      onChange={(e) => setSearch({ ...offerSearch, search: e.target.value, page: 1 })}
      uiVariant="search"
      className={inputVisibilityClass}
      placeholder={t("headerSearchPlaceholder")}
      inputProps={{
        "aria-label": t("headerSearchAria"),
      }}
      sx={homeMobileInputSx}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ marginRight: 0.5 }}>
              <span
                className={`flex shrink-0 items-center justify-center rounded-full bg-[#e3f5ee] text-[#0d9488] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ${
                  isHomeMobile ? "h-10 w-10" : "h-9 w-9"
                }`}
                aria-hidden
              >
                <Search sx={{ fontSize: isHomeMobile ? 22 : 20 }} />
              </span>
            </InputAdornment>
          ),
        },
      }}
    />
  );

  return (
    <>
      {isHomeMobile ? (
        <div
          className="w-full min-w-0 touch-manipulation"
          role="search"
          aria-label={t("headerSearchAria")}
        >
          {searchField}
        </div>
      ) : (
        searchField
      )}
      <Popper
        id={popperId}
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        ref={popperRef}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        <Box
          sx={{
            border: "1px solid rgba(0, 170, 128, 0.1)",
            borderRadius: "20px",
            p: "20px",
            bgcolor: "#fafdfb",
            mt: 2,
            width: popperWidthPx != null ? `${popperWidthPx}px` : "min(560px, calc(100vw - 24px))",
            maxWidth: "min(560px, calc(100vw - 24px))",
            boxSizing: "border-box",
            boxShadow:
              "0 4px 6px -1px rgba(16, 53, 34, 0.06), 0 16px 40px -8px rgba(16, 53, 34, 0.12)",
            maxHeight: "min(72vh, 640px)",
            overflowY: "auto",
          }}
        >
          {!hasQuery ? (
            <>
              <MerchantListTracker
                items={trendingList}
                listId={trendingListId}
                listName={trendingListName}
                source={analyticsSource}
              />
              {trendingList.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#d1fae5] bg-white/80 px-4 py-8 text-center text-sm leading-relaxed text-[#6b7280]">
                  {t("headerSearchTrendingEmpty")}
                </p>
              ) : (
                <>
                  <div className="mb-4 rounded-2xl border border-[#d1fae5]/90 bg-gradient-to-br from-[#ecfdf5] via-[#f6fef9] to-white px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="flex gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#d1fae5]/80"
                        aria-hidden
                      >
                        <TrendingIcon width={22} height={14} fill="#059669" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[15px] font-semibold leading-tight tracking-tight text-[#103522]">
                          {t("headerSearchTrendingTitle")}
                        </p>
                        <p className="mt-1 text-sm leading-snug text-[#64748b]">
                          {t("headerSearchTrendingSubtitle")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {trendingList.map((offer, index) => (
                      <HeaderSearchPopperRow
                        key={offer._id}
                        offer={offer}
                        variant="trending-large"
                        trackingContext={{
                          listId: trendingListId,
                          listName: trendingListName,
                          position: index + 1,
                          source: analyticsSource,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <MerchantListTracker
                items={matchList}
                listId={searchListId}
                listName={searchListName}
                source={analyticsSource}
              />
              <MerchantListTracker
                items={trendingList}
                listId={trendingListId}
                listName={trendingListName}
                source={analyticsSource}
              />
              <div className="flex flex-col gap-4">
                {matchList.length > 0 ? (
                  <>
                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#00AA80]">
                        {t("headerSearchResultsTitle")}
                      </p>
                      <p className="mt-0.5 text-sm text-[#64748b]">
                        {t("headerSearchResultsSubtitle")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {matchList.map((offer, index) => (
                        <HeaderSearchPopperRow
                          key={offer._id}
                          offer={offer}
                          variant="compact"
                          trackingContext={{
                            listId: searchListId,
                            listName: searchListName,
                            position: index + 1,
                            source: analyticsSource,
                          }}
                        />
                      ))}
                    </div>
                    <Divider sx={{ borderColor: "rgba(0, 170, 128, 0.12)" }} />
                  </>
                ) : (
                  <p className="rounded-xl bg-white/90 px-3 py-2.5 text-sm leading-relaxed text-[#64748b] ring-1 ring-[#e5e7eb]">
                    {t("headerSearchNoMatches")}
                  </p>
                )}
                <div>
                  {trendingList.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#d1fae5] bg-white/80 px-3 py-4 text-center text-sm text-[#94a3b8]">
                      {t("headerSearchTrendingEmpty")}
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 rounded-2xl border border-[#d1fae5]/90 bg-gradient-to-br from-[#ecfdf5] via-[#f6fef9] to-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                        <div className="flex gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#d1fae5]/80"
                            aria-hidden
                          >
                            <TrendingIcon width={20} height={13} fill="#059669" />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-semibold leading-tight text-[#103522]">
                              {t("headerSearchTrendingTitle")}
                            </p>
                            <p className="mt-0.5 text-xs leading-snug text-[#64748b]">
                              {t("headerSearchTrendingSubtitle")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {trendingList.map((offer, index) => (
                          <HeaderSearchPopperRow
                            key={offer._id}
                            offer={offer}
                            variant="compact"
                            trackingContext={{
                              listId: trendingListId,
                              listName: trendingListName,
                              position: index + 1,
                              source: analyticsSource,
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </Box>
      </Popper>
    </>
  );
};

export default SearchShop;
