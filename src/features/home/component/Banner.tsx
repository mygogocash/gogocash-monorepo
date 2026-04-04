"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Mousewheel, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Image from "next/image";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { BannerHome } from "@/interfaces/offer";
import { Link } from "@/i18n/navigation";
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
  const sideBannerImageSizes =
    sideSlides.length === 1
      ? "(max-width: 1023px) 100vw, 360px"
      : "(max-width: 1023px) 50vw, 360px";

  return (
    <section className="gc-home-hero-section w-full">
      <div>
        {smokeTestEnabled && (
          <div className="mb-4 inline-flex rounded-full border border-[#FFD8A6] bg-linear-to-r from-[#FF6B35] to-[#FFB347] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(255,107,53,0.18)]">
            Test mode campaign preview
          </div>
        )}
        {/* Figma GoGoCash-1.0 514:66950 — main 800×450; side rails: 2-up grid on mobile, stacked from lg */}
        <div className="flex flex-col items-stretch gap-4 md:gap-5 lg:flex-row lg:items-stretch lg:gap-6">
          <div
            className={`gc-home-hero-swiper min-w-0 w-full ${
              showSideBanners ? "lg:w-[800px] lg:max-w-full lg:shrink-0" : "lg:max-w-full"
            }`}
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
                      <div className="relative w-full max-w-[800px] overflow-hidden rounded-[24px] bg-[#e8eaed] shadow-[0_12px_40px_rgba(12,20,18,0.1)] ring-1 ring-black/[0.06]">
                        <div className="relative aspect-[800/450] w-full">
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            priority={index === 0}
                            sizes="(max-width: 1024px) 100vw, 800px"
                            className="object-cover"
                          />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/0 via-black/0 to-black/30"
                          aria-hidden
                        />
                        <div
                          className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-[#00B14F] shadow-[0_14px_36px_rgba(16,34,23,0.16)] ring-1 ring-black/[0.05]"
                          aria-hidden
                        >
                          <ChevronRightIcon sx={{ fontSize: 26 }} />
                        </div>
                      </div>
                    )}
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {showSideBanners ? (
            <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:flex lg:h-[450px] lg:min-h-[450px] lg:flex-1 lg:flex-col lg:gap-4">
              {sideSlides.map((item, index) => (
                <Link
                  key={`banner${index}`}
                  href={`${item?.link ? item.link : "#"}`}
                  className={`block min-h-0 min-w-0 lg:flex lg:flex-1 lg:flex-col ${
                    sideSlides.length === 1 ? "col-span-2" : ""
                  }`}
                  onClick={() => {
                    trackPromotionSelect({
                      promotionId: `home_side_banner_${index + 1}`,
                      promotionName: `Home Side Banner ${index + 1}`,
                      creativeSlot: `side_banner_${index + 1}`,
                      destination: item.link,
                    });
                  }}
                >
                  <div className="relative min-h-[158px] w-full flex-1 overflow-hidden rounded-2xl bg-[#e8eaed] shadow-[0_8px_28px_rgba(12,20,18,0.08)] ring-1 ring-black/[0.05] md:min-h-[198px] lg:min-h-0">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes={sideBannerImageSizes}
                      className="object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/0 via-black/0 to-black/28"
                      aria-hidden
                    />
                    <div
                      className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-[#00B14F] shadow-[0_12px_30px_rgba(16,34,23,0.14)] ring-1 ring-black/[0.05]"
                      aria-hidden
                    >
                      <ChevronRightIcon sx={{ fontSize: 22 }} />
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
