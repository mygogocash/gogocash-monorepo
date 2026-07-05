import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CUSTOMER_QUERY_STALE_TIME_MS } from "../query/queryDefaults";
import { readHomeSources } from "../test-support/homeSource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("perf wave 4 — query cache, carousel driver, expo-image", () => {
  it("query defaults > given AppProviders > then staleTime is shared with account resources", () => {
    const providers = readMobileFile("src/providers/AppProviders.tsx");
    const accountResource = readMobileFile("src/account/customerAccountResource.ts");
    const questResource = readMobileFile("src/quest/questTaskResource.ts");

    expect(CUSTOMER_QUERY_STALE_TIME_MS).toBe(1000 * 60 * 5);
    expect(providers).toContain("customerQueryDefaults");
    expect(accountResource).not.toContain("staleTime:");
    expect(questResource).not.toContain("staleTime:");
    expect(accountResource).toContain("retry: false");
    expect(questResource).toContain("retry: false");
  });

  it("home carousels > given hero top-brand and promo pagers > then scroll events branch useNativeDriver via motion (web-safe)", () => {
    const homeSource = readHomeSources(mobileRoot);

    expect(homeSource).not.toContain("useNativeDriver: false");
    expect(homeSource).not.toContain("useNativeDriver: true");
    expect(homeSource.match(/motion\.useNativeDriver/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("CarouselDots > given scroll-linked pills > then width is fixed and scaleX is animated", () => {
    const dotsSource = readMobileFile("src/components/CarouselDots.tsx");

    expect(dotsSource).toContain("transform: [{ scaleX }]");
    expect(dotsSource).toContain("width: expandedWidth");
    expect(dotsSource).not.toContain("outputRange: [size, expandedWidth, size]");
  });

  it("BrandCard > given partner logos > then expo-image is used with contentFit contain", () => {
    const brandCard = readMobileFile("src/components/BrandCard.tsx");

    expect(brandCard).toContain('from "expo-image"');
    expect(brandCard).toContain('contentFit="contain"');
    expect(brandCard).toContain("brandLogoImage:");
    expect(brandCard).not.toContain("brandLogoFill");
    expect(brandCard).toContain("recyclingKey=");
    expect(brandCard).toContain('cachePolicy="memory-disk"');
    expect(brandCard).not.toMatch(
      /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*"react-native"/
    );
  });

  it("BrandCard > given remote logoUri > then large and compact visuals use card background not tint", () => {
    const brandCard = readMobileFile("src/components/BrandCard.tsx");

    expect(brandCard).toContain("const brandVisualBackground =");
    expect(brandCard).toMatch(
      /brandVisual[\s\S]*backgroundColor: brandVisualBackground/,
    );
    expect(brandCard).toMatch(
      /compactBrandVisual[\s\S]*backgroundColor: brandVisualBackground/,
    );
    expect(brandCard).not.toMatch(
      /compactBrandVisual[\s\S]*backgroundColor: tint/,
    );
  });

  it("BrandCard > given long cashback values > then caption truncates and value keeps full width", () => {
    const brandCard = readMobileFile("src/components/BrandCard.tsx");

    expect(brandCard).toMatch(
      /brandCashbackCaption:[\s\S]*flex:\s*1/,
    );
    expect(brandCard).toMatch(
      /brandCashback:[\s\S]*flexShrink:\s*0/,
    );
    expect(brandCard).toMatch(
      /compactCashbackCaption:[\s\S]*flex:\s*1/,
    );
    expect(brandCard).toMatch(
      /compactCashbackValue:[\s\S]*flexShrink:\s*0/,
    );
    expect(brandCard).toMatch(
      /brandCashbackRow[\s\S]*numberOfLines=\{1\}/,
    );
  });

  it("directory store cards > given remote logos > then expo-image uses contain on card background", () => {
    const shopCard = readMobileFile("src/screens/discovery/ShopDirectoryStoreCard.tsx");
    const brandCard = readMobileFile("src/screens/discovery/BrandDirectoryStoreCard.tsx");

    for (const source of [shopCard, brandCard]) {
      expect(source).toContain('from "expo-image"');
      expect(source).toContain('contentFit="contain"');
      expect(source).toContain("store.logoUri");
      expect(source).toContain("colors.card");
      expect(source).not.toMatch(
        /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*"react-native"/,
      );
    }
  });

  it("BrandCard > given custom onPress > then it skips Link so search suggestions stay on-screen", () => {
    const brandCard = readMobileFile("src/components/BrandCard.tsx");

    expect(brandCard).toContain("if (props.onPress)");
    expect(brandCard).toMatch(/if \(props\.onPress\) \{[\s\S]*?return card;/);
  });

  it("HomeHeroBanners > given remote hero art > then expo-image renders HD-safe hero banners", () => {
    const heroBanners = readMobileFile("src/screens/home/HomeHeroBanners.tsx");
    const heroBannerImage = readMobileFile("src/screens/home/HeroBannerImage.tsx");

    expect(heroBanners).toContain("HeroBannerImage");
    expect(heroBanners).toContain("prefetchRemoteImages");
    expect(heroBannerImage).toContain('from "expo-image"');
    expect(heroBannerImage).toContain('cachePolicy="memory-disk"');
    expect(heroBannerImage).toContain('contentFit={HOME_HERO_BANNER_CONTENT_FIT}');
    expect(heroBannerImage).toContain("allowDownscaling={false}");
    expect(heroBannerImage).toContain('priority="high"');
  });

  it("HomeSearchResultRow > given remote brand logos > then expo-image caches search hits", () => {
    const searchRow = readMobileFile("src/screens/home/HomeSearchResultRow.tsx");

    expect(searchRow).toContain('from "expo-image"');
    expect(searchRow).toContain('contentFit="contain"');
    expect(searchRow).toContain('cachePolicy="memory-disk"');
    expect(searchRow).not.toMatch(
      /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*"react-native"/
    );
  });

  it("AppProviders > given startup gate > then QueryClientProvider wraps the loading shell", () => {
    const providers = readMobileFile("src/providers/AppProviders.tsx");

    expect(providers).toContain("<QueryClientProvider client={queryClient}>");
    expect(providers).toContain("AccountResourceWarmup");
    expect(providers).toContain("PublicCatalogRefetchOnFocus");
  });
});
