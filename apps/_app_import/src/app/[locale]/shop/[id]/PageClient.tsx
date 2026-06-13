"use client";

import dynamic from "next/dynamic";

const ShopDetail = dynamic(() => import("@/features/shop/component/ShopDetail"), {
  ssr: false,
  loading: () => (
    <div className="w-full pb-10">
      <div className="gc-home-layout">
        <div
          className="flex min-h-[400px] w-full animate-pulse items-center justify-center rounded-3xl bg-[#f6f6f6]"
          aria-hidden
        />
      </div>
    </div>
  ),
});

/**
 * Merchant summary layout shell — GoGoCash 1.1
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8345-118148
 */
export default function PageClient() {
  return (
    <div className="w-full pb-10">
      <div className="gc-home-layout">
        <ShopDetail />
      </div>
    </div>
  );
}
