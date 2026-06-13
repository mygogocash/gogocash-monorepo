import type { BannerHome } from "@/interfaces/offer";
import { pathImage } from "@/lib/utils";

export const DEFAULT_MAIN_BANNER = "/home/banner.webp";

export type HomeBannerSlide = { image: string; link?: string };

export function isNonEmptyImage(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildMainHeroSlides(data: BannerHome | undefined): HomeBannerSlide[] {
  const fromApi = data?.main_slides;
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    const slides = fromApi
      .filter((s) => s && isNonEmptyImage(s.image))
      .map((s) => ({
        image: pathImage(s.image),
        link: isNonEmptyImage(s.link) ? s.link : undefined,
      }));
    if (slides.length > 0) {
      return slides;
    }
  }

  const legacy: HomeBannerSlide[] = [];
  const triple: [string | undefined, string | undefined][] = [
    [data?.image_1, data?.link_1],
    [data?.image_2, data?.link_2],
    [data?.image_3, data?.link_3],
  ];
  for (const [img, link] of triple) {
    if (isNonEmptyImage(img)) {
      legacy.push({
        image: pathImage(img),
        link: isNonEmptyImage(link) ? link : undefined,
      });
    }
  }
  if (legacy.length > 0) {
    return legacy;
  }

  return [
    {
      image: DEFAULT_MAIN_BANNER,
      link: isNonEmptyImage(data?.link_1) ? data.link_1 : undefined,
    },
  ];
}

/** Right-rail slots: only CMS-filled images (no placeholder slides). */
export function buildSideBannerSlides(data: BannerHome | undefined): HomeBannerSlide[] {
  const pairs: [string | undefined, string | undefined][] = [
    [data?.image_4, data?.link_4],
    [data?.image_5, data?.link_5],
  ];
  const out: HomeBannerSlide[] = [];
  for (const [img, link] of pairs) {
    if (isNonEmptyImage(img)) {
      out.push({
        image: pathImage(img),
        link: isNonEmptyImage(link) ? link : undefined,
      });
    }
  }
  return out;
}
