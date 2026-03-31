"use client";
import CardImage from "@/components/common/card/CardImage";
import Input from "@/components/common/Input";
import HomeSectionHeader from "@/features/home/common/HomeSectionHeader";
import { IResponseCategory } from "@/interfaces/shop";
import { fetcher } from "@/lib/axios/client";
import { pathImage } from "@/lib/utils";
import Search from "@mui/icons-material/Search";
import { InputAdornment, Pagination } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { trackCategorySelect } from "@/lib/analytics";

const ListCate = () => {
  const params = useParams();
  const name = params ? params?.name : "";
  const t = useTranslations();

  const [offerSearch, setOfferSearch] = useState({
    category: name,
    page: 1,
    limit: 16,
    search: "",
  });

  const { data: category } = useQuery<IResponseCategory[]>({
    queryKey: ["getCategory"],
    queryFn: () => fetcher(`/offer/get-category/list`),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const filteredCategories =
    category
      ?.filter((item) => item.name !== "Involve Asia")
      ?.filter((item) => item.name.toLowerCase().includes(offerSearch.search.toLowerCase())) || [];

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / offerSearch.limit));

  const paginatedCategories = filteredCategories.slice(
    (offerSearch.page - 1) * offerSearch.limit,
    offerSearch.page * offerSearch.limit
  );

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-6">
      <HomeSectionHeader variant="sectionRow" icon="📂" title={t("shopCategoriesHeading")} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <p className="text-[15px] leading-7 text-[#5B6B61]">
          {t("categoryIndexAvailableCount", { count: filteredCategories.length })}
        </p>
        <div className="gc-soft-panel w-full shrink-0 p-4 sm:max-w-sm">
          <Input
            uiVariant="soft"
            onChange={(e) => {
              setOfferSearch((prev) => ({
                ...prev,
                search: e.target.value,
                page: 1,
              }));
            }}
            placeholder={t("categoryIndexSearchPlaceholder")}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="start">
                    <Search className="text-[#5B6B61]" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {paginatedCategories.map((categoryItem, index) => {
          return (
            <CardImage
              key={`${categoryItem.name}-${index}`}
              logo={`${categoryItem.image ? pathImage(categoryItem.image) : "/home/banner.webp"}`}
              offer_name={categoryItem.name}
              percent=""
              show_name_1
              green_text
              link={`/category/${categoryItem.name}`}
              onClick={() => {
                trackCategorySelect({
                  categoryName: categoryItem.name,
                  source: "category_index",
                });
              }}
            />
          );
        })}
      </div>
      <div className="gc-soft-panel flex items-center justify-center rounded-[28px] px-4 py-5">
        <Pagination
          count={totalPages}
          variant="outlined"
          shape="rounded"
          onChange={(_, page) => {
            setOfferSearch((prev) => ({ ...prev, page }));
          }}
          sx={{
            " .Mui-selected": {
              backgroundColor: "#00B14F !important",
              color: "#FFFFFF",
            },
          }}
        />
      </div>
    </section>
  );
};
export default ListCate;
