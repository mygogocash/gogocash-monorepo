"use client";

import List from "@/features/shop/component/List";
import ShopPromotionHero from "@/features/shop/component/ShopPromotionHero";

export default function PageClient() {
  return (
    <div className="gc-home-page">
      <div className="gc-home-layout gc-page-block w-full">
        <ShopPromotionHero />
      </div>
      <List mode="brands" />
    </div>
  );
}
