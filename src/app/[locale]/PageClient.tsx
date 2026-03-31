"use client";

import dynamic from "next/dynamic";
import ModalAfterLogin from "@/features/home/component/ModalAfterLogin";

const Banner = dynamic(() => import("@/features/home/component/Banner"), {
  loading: () => (
    <div
      className="h-[240px] w-full max-w-[800px] animate-pulse rounded-3xl bg-[#e8e8e8] sm:h-[320px] lg:h-[450px]"
      aria-hidden
    />
  ),
});

const Extra = dynamic(() => import("@/features/home/component/Extra"), {
  loading: () => <div className="h-24 w-full animate-pulse rounded-2xl bg-[#f0f0f0]" aria-hidden />,
});

const Trending = dynamic(() => import("@/features/home/component/Trending"));

const Special = dynamic(() => import("@/features/home/component/Special"), {
  loading: () => <div className="h-40 w-full animate-pulse rounded-2xl bg-[#f0f0f0]" aria-hidden />,
});

const Popular = dynamic(() => import("@/features/home/component/Popular"), {
  loading: () => <div className="h-40 w-full animate-pulse rounded-2xl bg-[#f0f0f0]" aria-hidden />,
});

const CategoryHome = dynamic(() => import("@/features/home/component/CategoryHome"), {
  loading: () => <div className="h-48 w-full animate-pulse rounded-2xl bg-[#f0f0f0]" aria-hidden />,
});

export default function PageClient() {
  return (
    <div className="gc-home-page">
      <div className="gc-home-layout">
        <ModalAfterLogin />
        <Banner />
        <Extra />
        <Trending />
        <Special />
        <Popular />
        <CategoryHome />
      </div>
    </div>
  );
}
