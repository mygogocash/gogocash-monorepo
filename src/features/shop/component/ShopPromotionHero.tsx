"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import ArrowIcon from "@/components/icons/ArrowIcon";
import { SHOP_PROMO_MAX_SLIDES, SHOP_PROMO_SWIPER_SPEED_MS } from "@/features/shop/constants";

import "swiper/css";
import "swiper/css/pagination";
import "@/features/shop/styles/shop-promotion-swiper.css";

const PROMO_IMAGE = "/images/shop/promo-gogoquest.png";
/** White→transparent edge for the faded next-slide preview (Back White.svg). */
const PROMO_PREVIEW_EDGE_SVG = "/images/shop/promo-edge-back-white.svg";
const NEXT_BTN_CLASS = "shop-promo-swiper-button-next";

/** Manual - Promotion Banner Section.svg / 9038:928952 — bottom vignette (paint0_linear), 450px-tall slot */
const PROMO_BANNER_VIGNETTE =
  "linear-gradient(180deg,transparent_0%,transparent_85.666%,rgba(0,0,0,0.2)_100%)";

/**
 * Shop — Promotion by Brands.
 *
 * - **9038:928945** — parent section / frame in Figma (headline + carousel block).
 * - **9038:928952** — carousel strip asset (800×450 slides, 24px gap, edge fade, next control).
 *
 * Layout is **LTR-first** (`end-0` for fade + button). App locales today do not set `dir="rtl"`;
 * when RTL is enabled on an ancestor, `rtl:scale-x-[-1]` mirrors the horizontal fade; re-check
 * arrow direction and pagination if you add full RTL support.
 *
 * `overflow-hidden` clips slides beyond the active + faded-next preview; parent uses `min-w-0`
 * so flex ancestors don’t force horizontal overflow on narrow viewports.
 */
export default function ShopPromotionHero() {
  const t = useTranslations();
  const slideStatusId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section
      id="promotion-by-brands"
      aria-labelledby="promotion-by-brands-heading"
      className="gc-home-section-y w-full"
    >
      <div className="flex w-full flex-col gap-6">
        {/* Figma 9038:928946 — Headline, h-[56px] */}
        <div className="flex min-h-14 w-full items-center">
          <h1
            id="promotion-by-brands-heading"
            className="text-[clamp(1.375rem,3.2vw,2.5rem)] font-semibold leading-none tracking-normal text-[#3b3b3b]"
          >
            {t("shopPromotionByBrandsTitle")}
          </h1>
        </div>

        <div
          className="relative isolate w-full min-w-0"
          role="region"
          aria-label={t("shopPromoCarouselRegionLabel")}
        >
          <p id={slideStatusId} className="sr-only" aria-live="polite" aria-atomic="true">
            {t("shopPromoCarouselSlideStatus", {
              current: activeIndex + 1,
              total: SHOP_PROMO_MAX_SLIDES,
            })}
          </p>

          <Swiper
            modules={[Navigation, Pagination]}
            navigation={{ nextEl: `.${NEXT_BTN_CLASS}` }}
            pagination={{ clickable: true }}
            spaceBetween={24}
            slidesPerView="auto"
            speed={SHOP_PROMO_SWIPER_SPEED_MS}
            className="shop-promo-swiper shop-promo-swiper--paginated shop-promo-swiper--fade-preview relative z-0 overflow-hidden"
            aria-describedby={slideStatusId}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          >
            {Array.from({ length: SHOP_PROMO_MAX_SLIDES }).map((_, i) => (
              <SwiperSlide key={i} className="w-auto!">
                <div className="relative aspect-800/450 w-[min(50rem,85vw)] max-w-[min(800px,calc(100vw-2rem))] overflow-hidden rounded-[24px] md:aspect-auto md:h-[450px] md:w-[800px] md:max-w-[800px]">
                  <Image
                    src={PROMO_IMAGE}
                    alt={t("shopPromoBannerAlt")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 85vw, 800px"
                    priority={i === 0}
                  />
                  {/* 9038:928952 — paint0_linear + fill-opacity 0.2 on banner */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: PROMO_BANNER_VIGNETTE }}
                    aria-hidden
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Preview edge: Back White.svg gradient over the faded next slide */}
          <div
            className="pointer-events-none absolute inset-y-0 inset-e-0 z-6 h-full w-[min(377px,30.58vw)] max-w-[377px] rtl:scale-x-[-1]"
            aria-hidden
          >
            <Image
              src={PROMO_PREVIEW_EDGE_SVG}
              alt=""
              width={377}
              height={450}
              className="h-full w-full object-cover object-right"
            />
          </div>

          {/* 9038:928952 — 64px circle; Swiper sets native disabled + swiper-button-disabled on last slide */}
          <button
            type="button"
            className={`${NEXT_BTN_CLASS} absolute inset-e-0 top-1/2 z-10 flex size-14 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white shadow-lg transition-opacity after:hidden hover:opacity-90 md:size-16`}
            aria-label={t("carouselNext")}
          >
            <ArrowIcon fill="#ffffff" width={28} height={16} className="rotate-270" />
          </button>
        </div>
      </div>
    </section>
  );
}
