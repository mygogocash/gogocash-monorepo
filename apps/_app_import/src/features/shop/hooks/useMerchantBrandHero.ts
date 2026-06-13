import type { DataOffer } from "@/interfaces/offer";
import { env } from "@/env";
import { extractBrandfetchDomain, type BrandfetchHeroApiResponse } from "@/lib/brandfetch/parse";
import { banner, pathImage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useMerchantBrandHero(offer: DataOffer | undefined, isMdUp: boolean) {
  const brandDomain = useMemo(
    () =>
      extractBrandfetchDomain(offer?.preview_url) ?? extractBrandfetchDomain(offer?.directory_page),
    [offer?.preview_url, offer?.directory_page]
  );

  const { data: brandHeroResponse } = useQuery<BrandfetchHeroApiResponse>({
    queryKey: ["brandfetchHero", brandDomain],
    queryFn: async () => {
      const res = await fetch(`/api/brandfetch?domain=${encodeURIComponent(brandDomain!)}`);
      return (await res.json()) as BrandfetchHeroApiResponse;
    },
    enabled: Boolean(brandDomain),
    staleTime: 60 * 60 * 1000,
  });

  const preferBrandfetchHero =
    env.NEXT_PUBLIC_BRANDFETCH_HERO === "1" || env.NEXT_PUBLIC_BRANDFETCH_HERO === "true";

  const brandHero = brandHeroResponse?.ok === true ? brandHeroResponse : null;

  const { heroBannerSrc, heroLogoSrc, heroBannerIsStock } = useMemo(() => {
    const offerHasBanner = Boolean(offer?.banner || offer?.banner_mobile);
    const offerBannerSrc = offerHasBanner
      ? banner(offer?.banner_mobile ?? "", offer?.banner ?? "", isMdUp)
      : "";
    const useBfBanner = Boolean(brandHero?.bannerUrl) && (preferBrandfetchHero || !offerHasBanner);
    const heroBannerSrc = useBfBanner
      ? (brandHero!.bannerUrl as string)
      : offerBannerSrc || "/home/banner.webp";

    const offerLogoSrc =
      (offer?.logo_circle
        ? pathImage(offer.logo_circle)
        : pathImage(offer?.logo || "") || offer?.logo || "") || "";
    const brandLogoSrc = (brandHero?.iconUrl || brandHero?.logoUrl || "").trim();
    const useBfLogo = Boolean(brandLogoSrc) && (preferBrandfetchHero || !offerLogoSrc);
    const heroLogoSrc = (useBfLogo ? brandLogoSrc : offerLogoSrc) || "/logo_green.png";

    return {
      heroBannerSrc,
      heroLogoSrc,
      heroBannerIsStock: heroBannerSrc === "/home/banner.webp",
    };
  }, [brandHero, isMdUp, offer, preferBrandfetchHero]);

  return { heroBannerSrc, heroLogoSrc, heroBannerIsStock, brandDomain };
}
