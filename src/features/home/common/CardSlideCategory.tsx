import { Swiper, SwiperClass, SwiperSlide } from "swiper/react";
import { Grid, Mousewheel, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/grid";
import "swiper/css/pagination";
import ArrowIcon from "@/components/icons/ArrowIcon";
import { NavigationOptions } from "swiper/types";
import { useEffect, useRef, useState } from "react";
import CardSpecial from "@/components/common/card/CardSpecial";
import CardShopMini from "@/components/common/card/CardShopMini";
import CardShopMobileDefault from "@/components/common/card/CardShopMobileDefault";
import CardBrandLogo from "@/components/common/card/CardBrandLogo";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { DataOffer } from "@/interfaces/offer";
import { Link } from "@/i18n/navigation";
import {
  getBrandTileTint,
  getOfferBannerSrc,
  getOfferCashbackPercentLabel,
  getOfferSquareLogoSrc,
} from "@/lib/offer/offerCardVisuals";
import { offerHasGrabCouponBadge } from "@/lib/offer/offerGrabCouponBadge";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { trackMerchantSelect } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface IProp {
  list?: DataOffer[];
  trackingListId: string;
  trackingListName: string;
  /**
   * `mini` — Figma 8290:133549 ShopCards Mini (184×156, 6×2 grid desktop).
   * `featured` — CardSpecial (Figma GoGoCash 1.1 node 9711:194922 Shop Cards).
   * `brandLogo` — 1:1 brand-logo tile with full meta, 6-col desktop (Top Brands).
   * `brandLogoBadge` — 1:1 brand-logo tile with compact meta, 8-col desktop (Trending Brands).
   */
  cardVariant?: "mini" | "featured" | "brandLogo" | "brandLogoBadge";
  /** Figma 9509:146306 Top Brands — dot pagination under carousel */
  showPagination?: boolean;
  /**
   * Figma 8290:133550 Cover — single row (no 2-row grid), same breakpoints as featured (up to 4-up),
   * 24px gaps, `centerInsufficientSlides` when fewer cards than columns.
   * Only applies with `cardVariant="featured"`.
   */
  slideLayout?: "default" | "cover";
  /** Prev/next arrow controls (desktop). Default true. */
  showNavigation?: boolean;
  /**
   * With `slideLayout="cover"` + `cardVariant="featured"`, render up to N cards in a plain grid (no Swiper).
   */
  staticRowMax?: number;
  /**
   * With static cover grid: cap items to this many rows × column count (2 cols below md, 4 cols md+).
   * When set, overrides `staticRowMax` for the slice size.
   */
  staticGridRows?: number;
  /** Cap how many offers are rendered (swiper or static grid). */
  maxItems?: number;
  /** Mobile featured 2-col grid only: max rows (2 cards per row). E.g. `4` → 8 cards. Default 16 items. */
  mobileFeaturedGridRows?: number;
}

const MINI_BREAKPOINTS = {
  0: {
    slidesPerView: 1,
    slidesPerGroup: 1,
    spaceBetween: 16,
  },
  480: {
    slidesPerView: 2,
    slidesPerGroup: 2,
    spaceBetween: 19,
  },
  640: {
    slidesPerView: 3,
    slidesPerGroup: 3,
    spaceBetween: 19,
  },
  900: {
    slidesPerView: 4,
    slidesPerGroup: 4,
    spaceBetween: 19,
  },
  1100: {
    slidesPerView: 5,
    slidesPerGroup: 5,
    spaceBetween: 19,
  },
  1280: {
    slidesPerView: 6,
    slidesPerGroup: 6,
    spaceBetween: 19,
  },
} as const;

const FEATURED_BREAKPOINTS = {
  0: {
    slidesPerView: 1,
    slidesPerGroup: 1,
    spaceBetween: 16,
  },
  400: {
    slidesPerView: 2,
    slidesPerGroup: 2,
    spaceBetween: 20,
  },
  768: {
    slidesPerView: 3,
    slidesPerGroup: 3,
    spaceBetween: 24,
  },
  1024: {
    slidesPerView: 4,
    slidesPerGroup: 4,
    spaceBetween: 24,
  },
} as const;

/**
 * Brand-logo badge: ultra-compact 1:1 tile with name + cashback only.
 * 4→5→6→8 columns as width grows.
 */
const BRAND_LOGO_BADGE_BREAKPOINTS = {
  0: {
    slidesPerView: 3,
    slidesPerGroup: 3,
    spaceBetween: 10,
  },
  480: {
    slidesPerView: 4,
    slidesPerGroup: 4,
    spaceBetween: 12,
  },
  768: {
    slidesPerView: 5,
    slidesPerGroup: 5,
    spaceBetween: 14,
  },
  1024: {
    slidesPerView: 6,
    slidesPerGroup: 6,
    spaceBetween: 16,
  },
  1280: {
    slidesPerView: 8,
    slidesPerGroup: 8,
    spaceBetween: 16,
  },
} as const;

/**
 * Brand-logo tiles are denser than featured cards — 3→4→6 columns as width grows.
 * Spacing grows with viewport so rows don't feel packed at desktop widths.
 */
const BRAND_LOGO_BREAKPOINTS = {
  0: {
    slidesPerView: 2,
    slidesPerGroup: 2,
    spaceBetween: 12,
  },
  480: {
    slidesPerView: 3,
    slidesPerGroup: 3,
    spaceBetween: 16,
  },
  768: {
    slidesPerView: 4,
    slidesPerGroup: 4,
    spaceBetween: 20,
  },
  1024: {
    slidesPerView: 5,
    slidesPerGroup: 5,
    spaceBetween: 20,
  },
  1280: {
    slidesPerView: 6,
    slidesPerGroup: 6,
    spaceBetween: 24,
  },
} as const;

/** Mobile featured: 2-column grid, 8px gap; cap list length. */
const MOBILE_FEATURED_MAX = 16;

const CardSlideCategory = ({
  list,
  trackingListId,
  trackingListName,
  cardVariant = "mini",
  showPagination = false,
  slideLayout = "default",
  showNavigation = true,
  staticRowMax,
  staticGridRows,
  maxItems,
  mobileFeaturedGridRows,
}: IProp) => {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [swiperRef, setSwiperRef] = useState<SwiperClass | null>(null);
  const lg = useBreakpointMdUp();
  const isMini = cardVariant === "mini";
  const isBrandLogo = cardVariant === "brandLogo";
  const isBrandLogoBadge = cardVariant === "brandLogoBadge";
  const isAnyBrandLogo = isBrandLogo || isBrandLogoBadge;
  const isCover =
    slideLayout === "cover" && cardVariant === "featured" && !isMini && !isAnyBrandLogo;
  const isStaticCoverRow = isCover && (staticRowMax != null || staticGridRows != null);
  const effectiveList = maxItems != null ? list?.slice(0, maxItems) : list;
  const staticCoverCap =
    staticGridRows != null ? staticGridRows * (lg ? 4 : 2) : (staticRowMax ?? 0);
  const displayList = isStaticCoverRow ? effectiveList?.slice(0, staticCoverCap) : effectiveList;

  const modules = [
    Mousewheel,
    ...(isCover ? [] : [Grid]),
    ...(showNavigation ? [Navigation] : []),
    ...(showPagination ? [Pagination] : []),
  ];

  useEffect(() => {
    if (!showNavigation || !swiperRef?.params) return;
    // eslint-disable-next-line react-hooks/immutability
    (swiperRef.params.navigation as NavigationOptions).prevEl = prevRef.current;
    (swiperRef.params.navigation as NavigationOptions).nextEl = nextRef.current;
    swiperRef.navigation.init();
    swiperRef.navigation.update();
  }, [showNavigation, swiperRef]);

  const renderOfferCard = (offer: DataOffer, index: number) => {
    const bannerSrc = getOfferBannerSrc(offer, lg);
    const percentStr = getOfferCashbackPercentLabel(offer);
    const showGrabCoupon = offerHasGrabCouponBadge(offer);

    const trackClick = () => {
      trackMerchantSelect({
        merchant: offer,
        listId: trackingListId,
        listName: trackingListName,
        position: index + 1,
        source: "home_category_carousel",
      });
    };

    if (isAnyBrandLogo) {
      const logoSrc = getOfferSquareLogoSrc(offer, lg);
      const tint = getBrandTileTint(offer._id || offer.offer_name);
      return (
        <div className="gc-hover-lift relative flex h-full min-h-0 min-w-0 w-full max-w-[280px] flex-col">
          <Link
            href={`/shop/${offer._id}`}
            className="absolute inset-0 z-0"
            aria-label={offer.offer_name}
            onClick={trackClick}
          />
          <div className="pointer-events-none relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
            <CardBrandLogo
              logo={logoSrc}
              offer_name={offer.offer_name}
              percent={percentStr}
              categories={offer.categories}
              showGrabCoupon={showGrabCoupon}
              tint={tint}
              layout={isBrandLogoBadge ? "compact" : "full"}
            />
          </div>
        </div>
      );
    }

    if (isMini) {
      return (
        <Link
          href={`/shop/${offer._id}`}
          className={isCover ? "block h-full w-full max-w-[280px]" : "block h-full"}
          onClick={trackClick}
        >
          <CardShopMini banner={bannerSrc} offer_name={offer.offer_name} percent={percentStr} />
        </Link>
      );
    }

    /** CardSpecial contains a favorite `<button>` — avoid nesting interactive content inside `<a>` (stretch-link pattern). */
    const featuredOuterClass = isCover
      ? "gc-hover-lift relative block h-full w-full max-w-[280px]"
      : "gc-hover-lift relative flex h-full min-h-0 w-full max-w-[280px] flex-col";

    return (
      <div className={featuredOuterClass}>
        <Link
          href={`/shop/${offer._id}`}
          className="absolute inset-0 z-0"
          aria-label={offer.offer_name}
          onClick={trackClick}
        />
        <div className="pointer-events-none relative z-[1] min-h-0 flex flex-1 flex-col">
          <CardSpecial
            banner={bannerSrc}
            offer_name={offer.offer_name}
            percent={percentStr}
            categories={offer.categories}
            showGrabCoupon={showGrabCoupon}
          />
        </div>
      </div>
    );
  };

  const renderMobileFeaturedGridCard = (offer: DataOffer, index: number) => {
    const bannerSrc = getOfferBannerSrc(offer, lg);
    const percentStr = getOfferCashbackPercentLabel(offer);
    const showGrabCoupon = offerHasGrabCouponBadge(offer);
    const trackClick = () => {
      trackMerchantSelect({
        merchant: offer,
        listId: trackingListId,
        listName: trackingListName,
        position: index + 1,
        source: "home_category_carousel",
      });
    };
    return (
      <div className="gc-hover-lift relative flex w-full min-w-0 justify-center">
        <Link
          href={`/shop/${offer._id}`}
          className="absolute inset-0 z-0"
          aria-label={offer.offer_name}
          onClick={trackClick}
        />
        <div className="pointer-events-none relative z-[1] w-full min-w-0">
          <CardShopMobileDefault
            banner={bannerSrc}
            offer_name={offer.offer_name}
            percent={percentStr}
            categories={offer.categories}
            showGrabCoupon={showGrabCoupon}
          />
        </div>
      </div>
    );
  };

  if (isStaticCoverRow) {
    return (
      <div className={showPagination ? "gc-card-slide--paginated" : undefined}>
        <MerchantListTracker
          items={displayList}
          listId={trackingListId}
          listName={trackingListName}
          source="home_category_carousel"
        />
        <div className="pb-1 pt-0.5">
          <div className="grid w-full grid-cols-2 gap-2 sm:gap-5 md:grid-cols-4 md:gap-6">
            {displayList?.map((offer, index) => (
              <div
                key={offer._id}
                className={cn(
                  "box-border flex h-auto w-full min-w-0",
                  lg ? "max-w-[280px] justify-center justify-self-center" : "justify-center"
                )}
              >
                {!lg && !isMini
                  ? renderMobileFeaturedGridCard(offer, index)
                  : renderOfferCard(offer, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Mobile (<768px): 2-column CSS grid — Shop Card mobile default (Figma 8079:67033), 8px gap.
   * Dot pagination applies to the desktop/tablet carousel only.
   */
  const mobileFeaturedTwoCol =
    !lg && !isMini && !isCover && !isAnyBrandLogo && displayList && displayList.length > 0;
  if (mobileFeaturedTwoCol) {
    const mobileCap =
      mobileFeaturedGridRows != null ? mobileFeaturedGridRows * 2 : MOBILE_FEATURED_MAX;
    const mobileSlice = displayList.slice(0, mobileCap);
    return (
      <div>
        <MerchantListTracker
          items={mobileSlice}
          listId={trackingListId}
          listName={trackingListName}
          source="home_category_carousel"
        />
        <div className="grid w-full grid-cols-2 gap-2 pb-1 pt-0.5">
          {mobileSlice.map((offer, index) => (
            <div key={offer._id} className="min-w-0">
              {renderMobileFeaturedGridCard(offer, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={showPagination ? "gc-card-slide--paginated" : undefined}>
      <MerchantListTracker
        items={displayList}
        listId={trackingListId}
        listName={trackingListName}
        source="home_category_carousel"
      />
      <div className="relative">
        <div className="overflow-hidden pb-1 pt-0.5">
          <Swiper
            onSwiper={(swiper: SwiperClass) => setSwiperRef(swiper as SwiperClass)}
            modules={modules}
            {...(isCover
              ? {}
              : {
                  grid: { rows: 2, fill: "row" as const },
                })}
            navigation={
              showNavigation
                ? {
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                  }
                : false
            }
            pagination={showPagination ? { clickable: true } : undefined}
            mousewheel={{
              forceToAxis: true,
              sensitivity: 1,
              releaseOnEdges: true,
            }}
            slidesPerView={1}
            slidesPerGroup={1}
            spaceBetween={16}
            watchOverflow
            centerInsufficientSlides={isCover}
            /* Swiper’s Grid module can omit `swiper-grid` on first paint; CSS needs it for `.swiper-wrapper { flex-wrap: wrap }` (2-row layout). */
            className={cn("mySwiper", !isCover && "swiper-grid")}
            breakpoints={
              isBrandLogoBadge
                ? (BRAND_LOGO_BADGE_BREAKPOINTS as typeof BRAND_LOGO_BADGE_BREAKPOINTS)
                : isBrandLogo
                  ? (BRAND_LOGO_BREAKPOINTS as typeof BRAND_LOGO_BREAKPOINTS)
                  : isCover
                    ? (FEATURED_BREAKPOINTS as typeof FEATURED_BREAKPOINTS)
                    : isMini
                      ? (MINI_BREAKPOINTS as typeof MINI_BREAKPOINTS)
                      : (FEATURED_BREAKPOINTS as typeof FEATURED_BREAKPOINTS)
            }
          >
            {displayList?.map((offer, index) => (
              <SwiperSlide
                key={offer._id}
                className={
                  isCover
                    ? "h-auto! box-border flex justify-center"
                    : isMini
                      ? "h-auto!"
                      : "h-auto! box-border flex justify-center self-stretch"
                }
              >
                {renderOfferCard(offer, index)}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        {showNavigation ? (
          <div className="pointer-events-none absolute top-1/2 z-10 hidden w-full -translate-y-1/2 justify-between md:flex">
            <button
              ref={prevRef}
              type="button"
              className={cn(
                "swiper-custom-button-prev pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#D8E2D9] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(16,34,23,0.08)] backdrop-blur-sm",
                /** Brand-logo tiles are dense — pull arrows fully outside the tile column so they don't sit on top of cards. */
                isAnyBrandLogo ? "-ml-6" : "mx-[-14px]"
              )}
            >
              <ArrowIcon fill="#103522" className="rotate-90" />
            </button>
            <button
              ref={nextRef}
              type="button"
              className={cn(
                "swiper-custom-button-next pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#D8E2D9] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(16,34,23,0.08)] backdrop-blur-sm",
                isAnyBrandLogo ? "-mr-6" : "mx-[-14px]"
              )}
            >
              <ArrowIcon fill="#103522" className="rotate-270" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CardSlideCategory;
