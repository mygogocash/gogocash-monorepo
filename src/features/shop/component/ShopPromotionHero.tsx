"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Mousewheel, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { SHOP_PROMO_MAX_SLIDES, SHOP_PROMO_SWIPER_SPEED_MS } from "@/features/shop/constants";

import "swiper/css";
import "swiper/css/pagination";
import "@/features/shop/styles/shop-promotion-swiper.css";

const PROMO_IMAGE = "/images/shop/promo-gogoquest.png";

/** Manual - Promotion Banner Section.svg / 9038:928952 — bottom vignette (paint0_linear), 450px-tall slot */
const PROMO_BANNER_VIGNETTE =
  "linear-gradient(180deg,transparent_0%,transparent_85.666%,rgba(0,0,0,0.2)_100%)";

/**
 * Shop — Promotion by Brands.
 *
 * - **9038:928945** — parent section / frame in Figma (headline + carousel block).
 * - **9038:928952** — carousel strip asset (800×450 slides, 24px gap); dots + swipe/trackpad only.
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
            modules={[Pagination, Mousewheel]}
            pagination={{ clickable: true }}
            mousewheel={{
              forceToAxis: true,
              sensitivity: 1,
              releaseOnEdges: true,
            }}
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
        </div>
      </div>
    </section>
  );
}
