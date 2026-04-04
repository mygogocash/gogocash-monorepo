"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import CardSlideCategory from "@/features/home/common/CardSlideCategory";
import HomeSectionHeader from "@/features/home/common/HomeSectionHeader";
import { offerExtraQueryOptions } from "@/lib/queries/offerExtra";
import { SHOP_TOP_SHOPS_GRID_ROWS } from "@/features/shop/constants";

export default function ShopTopShopsSection() {
  const t = useTranslations();
  const { data: offers } = useQuery({ ...offerExtraQueryOptions });

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-6">
      <HomeSectionHeader
        variant="sectionRow"
        icon="🔥"
        title={t("shopTopShopsTitle")}
        link="#explore-shop"
      />
      <CardSlideCategory
        cardVariant="featured"
        slideLayout="cover"
        staticGridRows={SHOP_TOP_SHOPS_GRID_ROWS}
        showNavigation={false}
        list={offers}
        trackingListId="shop_top_shops"
        trackingListName="Top Brands"
      />
    </section>
  );
}
