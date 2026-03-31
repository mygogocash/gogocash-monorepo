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
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { DataOffer } from "@/interfaces/offer";
import { Link } from "@/i18n/navigation";
import { getOfferBannerSrc, getOfferCashbackPercentLabel } from "@/lib/offer/offerCardVisuals";
import { useMediaQuery } from "@mui/material";
import { trackMerchantSelect } from "@/lib/analytics";

interface IProp {
  list?: DataOffer[];
  trackingListId: string;
  trackingListName: string;
  /**
   * `mini` — Figma 8290:133549 ShopCards Mini (184×156, 6×2 grid desktop).
   * `featured` — CardSpecial (Figma GoGoCash 1.1 node 8285:91051 Shop Cards with Cover).
   */
  cardVariant?: "mini" | "featured";
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
}: IProp) => {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [swiperRef, setSwiperRef] = useState<SwiperClass | null>(null);
  const lg = useMediaQuery("(min-width:768px)");
  const isMini = cardVariant === "mini";
  const isCover = slideLayout === "cover" && cardVariant === "featured" && !isMini;
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

    return (
      <Link
        href={`/shop/${offer._id}`}
        className={isCover ? "block h-full w-full max-w-[280px]" : "block h-full"}
        onClick={() => {
          trackMerchantSelect({
            merchant: offer,
            listId: trackingListId,
            listName: trackingListName,
            position: index + 1,
            source: "home_category_carousel",
          });
        }}
      >
        {isMini ? (
          <CardShopMini banner={bannerSrc} offer_name={offer.offer_name} percent={percentStr} />
        ) : (
          <CardSpecial banner={bannerSrc} offer_name={offer.offer_name} percent={percentStr} />
        )}
      </Link>
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
          <div className="grid w-full grid-cols-2 justify-items-center gap-4 sm:gap-5 md:grid-cols-4 md:gap-6">
            {displayList?.map((offer, index) => (
              <div
                key={offer._id}
                className="box-border flex h-auto w-full max-w-[280px] justify-center"
              >
                {renderOfferCard(offer, index)}
              </div>
            ))}
          </div>
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
            className="mySwiper"
            breakpoints={
              isCover
                ? (FEATURED_BREAKPOINTS as typeof FEATURED_BREAKPOINTS)
                : isMini
                  ? (MINI_BREAKPOINTS as typeof MINI_BREAKPOINTS)
                  : (FEATURED_BREAKPOINTS as typeof FEATURED_BREAKPOINTS)
            }
          >
            {displayList?.map((offer, index) => (
              <SwiperSlide
                key={offer._id}
                className={isCover ? "h-auto! box-border flex justify-center" : "h-auto!"}
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
              className="swiper-custom-button-prev pointer-events-auto mx-[-14px] flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#D8E2D9] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(16,34,23,0.08)] backdrop-blur-sm"
            >
              <ArrowIcon fill="#103522" className="rotate-90" />
            </button>
            <button
              ref={nextRef}
              type="button"
              className="swiper-custom-button-next pointer-events-auto mx-[-14px] flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#D8E2D9] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(16,34,23,0.08)] backdrop-blur-sm"
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
