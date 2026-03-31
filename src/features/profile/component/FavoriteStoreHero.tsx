"use client";

import Button from "@/components/common/Button";
import { designSystemColor } from "@/constants/design-system";
import Image from "next/image";
import { useTranslations } from "next-intl";

type FavoriteStoreHeroProps = {
  onSeeMore: () => void;
};

/**
 * GoGoCash 1.1 — Favorite Brands hero (Find your brands + CTA).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8705-139894
 */
export default function FavoriteStoreHero({ onSeeMore }: FavoriteStoreHeroProps) {
  const t = useTranslations();

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#e8faf5] via-white to-[#f2fbf8] shadow-[0px_4px_10px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-8 px-6 py-8 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-10">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex justify-center md:justify-start">
            <Image
              src="/logo_green.png"
              alt={t("favoritePageHeroLogoAlt")}
              width={60}
              height={60}
              className="size-[60px]"
            />
          </div>
          <h2 className="text-center text-[24px] font-semibold leading-tight text-[#00aa80] md:text-left md:text-[28px]">
            {t("favoritePageFindYourBrandTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-[400px] text-center text-[15px] font-normal leading-relaxed text-[#3b3b3b] md:mx-0 md:text-left md:text-[16px]">
            {t("favoritePageFindYourBrandDescription")}
          </p>
          <div className="mt-6 flex justify-center md:justify-start">
            <Button
              onClick={onSeeMore}
              uiVariant="primary"
              sx={{
                borderRadius: "999px",
                px: 3,
                py: 1.25,
                textTransform: "none",
                fontWeight: 600,
                background: designSystemColor.mint,
                boxShadow: "none",
                "&:hover": { background: designSystemColor.green2 },
              }}
            >
              {t("favoritePageSeeMore")}
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 justify-center md:justify-end">
          <Image
            src="/profile/bag.png"
            alt={t("favoritePageHeroIllustrationAlt")}
            width={355}
            height={258}
            className="h-auto max-h-[200px] w-auto max-w-[min(100%,355px)] object-contain md:max-h-none"
          />
        </div>
      </div>
    </div>
  );
}
