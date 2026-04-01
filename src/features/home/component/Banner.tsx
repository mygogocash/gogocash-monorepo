"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Mousewheel, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Box } from "@mui/material";
import Image from "next/image";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { BannerHome } from "@/interfaces/offer";
import { Link } from "@/i18n/navigation";
import UnionIcon from "@/components/icons/UnionIcon";
import { trackPromotionSelect } from "@/lib/analytics";
import { POSTHOG_FLAG_KEYS, usePostHogFlagEnabled } from "@/lib/posthog";
import { buildMainHeroSlides, buildSideBannerSlides } from "@/features/home/lib/buildHomeBanners";

const BANNER_STALE_MS = 60_000;

const Banner = () => {
  const smokeTestEnabled = usePostHogFlagEnabled(POSTHOG_FLAG_KEYS.smokeTest, false);

  const { data: bannerData } = useQuery<BannerHome>({
    queryKey: ["offer/banner-home"],
    queryFn: () => fetcher("/offer/banner-home"),
    staleTime: BANNER_STALE_MS,
  });
  const mainSlides = buildMainHeroSlides(bannerData);
  const showMainPagination = mainSlides.length > 1;
  const sideSlides = buildSideBannerSlides(bannerData);
  const showSideBanners = sideSlides.length > 0;

  return (
    <section className="gc-home-hero-section w-full">
      <div>
        {smokeTestEnabled && (
          <div className="mb-4 inline-flex rounded-full border border-[#FFD8A6] bg-linear-to-r from-[#FF6B35] to-[#FFB347] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(255,107,53,0.18)]">
            Test mode campaign preview
          </div>
        )}
        {/* Figma 8290:131028 — flex row, gap 24px; main 800×450 rounded-24; side stack gap-16 rounded-16 */}
        <div className="flex flex-col items-stretch gap-4 md:gap-5 lg:flex-row lg:gap-6">
          <Box
            className={
              showSideBanners
                ? "min-w-0 w-full lg:w-[800px] lg:max-w-full lg:shrink-0"
                : "min-w-0 w-full lg:max-w-full"
            }
            sx={{
              ".swiper-pagination": {
                bottom: "18px !important",
                left: "50% !important",
                transform: "translateX(-50%)",
                width: "auto !important",
                display: "flex",
                gap: "7px",
                justifyContent: "center",
              },
              ".swiper-pagination-bullet": {
                width: 8,
                height: 8,
                margin: "0 !important",
                background: "rgba(255, 255, 255, 0.45)",
                opacity: 1,
              },
              ".swiper-pagination-bullet-active": {
                background: "#ffffff !important",
              },
            }}
          >
            <Swiper
              pagination={showMainPagination ? { clickable: true } : false}
              modules={[Pagination, Autoplay, Mousewheel]}
              spaceBetween={0}
              slidesPerView={1}
              autoplay={showMainPagination ? { delay: 3000 } : false}
              mousewheel={{
                forceToAxis: true,
                sensitivity: 1,
                releaseOnEdges: true,
              }}
              watchOverflow
            >
              {mainSlides.map((item, index) => (
                <SwiperSlide key={index}>
                  <Link
                    href={`${item?.link ? item.link : "#"}`}
                    onClick={() => {
                      trackPromotionSelect({
                        promotionId: `home_main_banner_${index + 1}`,
                        promotionName: `Home Main Banner ${index + 1}`,
                        creativeSlot: `main_banner_${index + 1}`,
                        destination: item.link,
                      });
                    }}
                  >
                    {item && (
                      <div className="relative w-full max-w-[800px] overflow-hidden rounded-3xl bg-[#d9d9d9] lg:h-[450px]">
                        <div className="relative h-[240px] w-full sm:h-[320px] lg:absolute lg:inset-0 lg:h-full">
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            priority={index === 0}
                            sizes="(max-width: 1024px) 100vw, 800px"
                            className="object-cover lg:object-contain"
                          />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-86% to-black/20"
                          aria-hidden
                        />
                        <div className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-[#103522] shadow-[0_18px_40px_rgba(16,34,23,0.18)]">
                          <UnionIcon className="rotate-45" width={16} height={9} />
                        </div>
                      </div>
                    )}
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>

          {showSideBanners ? (
            <div className="flex w-full min-w-0 flex-col gap-4 lg:h-[450px] lg:min-h-[450px] lg:flex-1">
              {sideSlides.map((item, index) => (
                <Link
                  key={`banner${index}`}
                  href={`${item?.link ? item.link : "#"}`}
                  className="block min-h-0 w-full lg:flex lg:flex-1 lg:flex-col"
                  onClick={() => {
                    trackPromotionSelect({
                      promotionId: `home_side_banner_${index + 1}`,
                      promotionName: `Home Side Banner ${index + 1}`,
                      creativeSlot: `side_banner_${index + 1}`,
                      destination: item.link,
                    });
                  }}
                >
                  <div className="relative min-h-[158px] w-full flex-1 overflow-hidden rounded-2xl bg-[#d9d9d9] md:min-h-[198px] lg:min-h-0">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 360px"
                      className="object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-86% to-black/20"
                      aria-hidden
                    />
                    <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-[#103522] shadow-[0_16px_35px_rgba(16,34,23,0.18)]">
                      <UnionIcon className="rotate-45" width={15} height={8} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default Banner;
