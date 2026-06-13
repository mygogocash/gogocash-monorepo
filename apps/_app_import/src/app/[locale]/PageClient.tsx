"use client";

import dynamic from "next/dynamic";
import ModalAfterLogin from "@/features/home/component/ModalAfterLogin";

const Banner = dynamic(() => import("@/features/home/component/Banner"), {
  loading: () => (
    <div
      className="aspect-[800/450] w-full max-w-[800px] animate-pulse rounded-[24px] bg-[#e8eaed] shadow-[0_12px_40px_rgba(12,20,18,0.08)] ring-1 ring-black/[0.06]"
      aria-hidden
    />
  ),
});

const HomeHeroSearch = dynamic(() => import("@/features/search/component/SearchShop"), {
  ssr: false,
  loading: () => (
    <div className="w-full lg:hidden" aria-hidden>
      <div className="h-[52px] w-full animate-pulse rounded-full bg-[#e8eaed]" />
    </div>
  ),
});

const GoLinkBanner = dynamic(() => import("@/features/home/component/GoLinkBanner"), {
  loading: () => (
    <div
      className="hidden h-40 w-full animate-pulse rounded-[32px] bg-[#e8f7f2] md:block"
      aria-hidden
    />
  ),
});

const Extra = dynamic(() => import("@/features/home/component/Extra"), {
  loading: () => <div className="h-24 w-full animate-pulse rounded-2xl bg-[#f0f0f0]" aria-hidden />,
});

const MobileBrowseShortcuts = dynamic(
  () => import("@/features/home/component/MobileBrowseShortcuts"),
  {
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-2xl bg-[#f0f0f0] md:hidden" aria-hidden />
    ),
  }
);

const Trending = dynamic(() => import("@/features/home/component/Trending"));

const CategoryHome = dynamic(() => import("@/features/home/component/CategoryHome"), {
  loading: () => <div className="h-48 w-full animate-pulse rounded-2xl bg-[#f0f0f0]" aria-hidden />,
});

export default function PageClient() {
  return (
    <div className="gc-home-page">
      <div className="sticky top-0 z-30 w-full bg-(--background) px-4 pb-2 pt-[max(0.5rem,var(--gc-safe-top))] shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:hidden">
        <HomeHeroSearch variant="homeMobile" />
      </div>
      <div className="gc-home-layout gc-home-layout--stack gc-page-block">
        <ModalAfterLogin />
        <MobileBrowseShortcuts />
        <Banner />
        <GoLinkBanner />
        <Extra />
        <Trending />
        {/* Popular ("What's Popular Now?!") — hidden for now; restore `Popular` import + component when needed. */}
        <CategoryHome />
      </div>
    </div>
  );
}
