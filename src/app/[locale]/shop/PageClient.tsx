"use client";

import List from "@/features/shop/component/List";
import ShopPromotionHero from "@/features/shop/component/ShopPromotionHero";
import ShopTopShopsSection from "@/features/shop/component/ShopTopShopsSection";

export default function PageClient() {
  return (
    <div className="gc-home-page">
      <div className="gc-home-layout">
        <ShopPromotionHero />
        <ShopTopShopsSection />
      </div>
      <List />
    </div>
  );
}
