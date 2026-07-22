import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { expoConversionRouteOwnership } from "@mobile/navigation/expoConversionMatrix";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const publicDir = path.join(mobileRoot, "public");

const siteUrl = "https://app-staging.gogocash.co";
const locales = ["en", "th"] as const;

function readPublicFile(fileName: string) {
  return fs.readFileSync(path.join(publicDir, fileName));
}

function readPublicText(fileName: string) {
  return readPublicFile(fileName).toString("utf8");
}

function localizedRoute(locale: (typeof locales)[number], webPath: string) {
  return `${siteUrl}/${locale}${webPath === "/" ? "" : webPath}`;
}

describe("GoGoCash Expo web metadata parity", () => {
  it("web metadata parity > given the Next.js browser identity contract > then Expo public files expose matching GoGoCash icons and manifest", () => {
    const expectedFiles = [
      "favicon.ico",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "apple-touch-icon.png",
      "android-chrome-192x192.png",
      "android-chrome-512x512.png",
      "site.webmanifest",
      "index.html",
      "robots.txt",
      "home/banner.webp",
    ];

    for (const fileName of expectedFiles) {
      expect(fs.existsSync(path.join(publicDir, fileName)), fileName).toBe(true);
    }

    expect([...readPublicFile("favicon.ico").subarray(0, 4)]).toEqual([0, 0, 1, 0]);

    const manifest = JSON.parse(readPublicText("site.webmanifest")) as {
      background_color: string;
      display: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
      name: string;
      short_name: string;
      start_url: string;
      theme_color: string;
    };

    expect(manifest).toMatchObject({
      background_color: "#ffffff",
      display: "standalone",
      name: "GoGoCash",
      short_name: "GoGoCash",
      start_url: "/",
      theme_color: "#00B14F",
    });
    expect(manifest.icons).toEqual([
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ]);

    const html = readPublicText("index.html");
    expect(html).toContain("<title>%WEB_TITLE%</title>");
    expect(html).toContain('<meta name="description" content="GoGoCash is a cashback platform');
    expect(html).toContain('<meta name="theme-color" content="#00B14F"');
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes"');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest"');
    expect(html).toContain('<link rel="shortcut icon" href="/favicon.ico"');
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    expect(html).toContain('<meta property="og:site_name" content="GoGoCash"');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<meta property="og:image" content="/home/banner.webp"');
    // Share-preview tagline (founder 2026-07-22): "Earn Cash on Every Spend" — the cashback
    // brand earns you cash back. Pin both og + twitter titles and guard the old "Save" copy.
    expect(html).toContain(
      '<meta property="og:title" content="GoGoCash - Earn Cash on Every Spend"'
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="GoGoCash - Earn Cash on Every Spend"'
    );
    expect(html).not.toContain("Save Cash on Every Spend");
    // Share-preview image dimensions + alt + type (2026-07-23): og:image:width/height let
    // iMessage/Facebook render the card on first fetch instead of guessing; alt aids a11y.
    expect(html).toContain('<meta property="og:image:width" content="1200"');
    expect(html).toContain('<meta property="og:image:height" content="630"');
    expect(html).toContain('<meta property="og:image:alt" content="GoGoCash — Earn Cashback on Every Spend"');
    expect(html).toContain('<meta property="og:type" content="website"');
    expect(html).toContain('<meta name="twitter:image:alt" content="GoGoCash — Earn Cashback on Every Spend"');
    // SEO wins (2026-07-23): drop the dead IE tag, add robots large-preview, bilingual og:locale,
    // preconnect the brand image CDN, and JSON-LD Organization + WebSite (search box + logo).
    expect(html).not.toContain("X-UA-Compatible");
    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large');
    expect(html).toContain('<meta property="og:locale" content="en_US"');
    expect(html).toContain('<meta property="og:locale:alternate" content="th_TH"');
    expect(html).toContain('rel="preconnect" href="https://media.gogocash.co"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type": "Organization"');
    expect(html).toContain('"@type": "WebSite"');
    expect(html).toContain('"@type": "SearchAction"');
  });

  it("web metadata parity > given the migrated route catalog > then sitemap exposes localized concrete customer URLs", () => {
    const sitemap = readPublicText("sitemap.xml");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const concreteRoutes = expoConversionRouteOwnership
      .filter((route) => route.owner === "expo_customer")
      .filter((route) => !route.webPath.includes("["));
    const expectedLocs = concreteRoutes.flatMap((route) =>
      locales.map((locale) => localizedRoute(locale, route.webPath))
    );

    expect(sitemap).toContain('urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(locs).toEqual(expectedLocs);
    expect(locs).toContain("https://app-staging.gogocash.co/en");
    expect(locs).toContain("https://app-staging.gogocash.co/th/privacy-policy");
    expect(sitemap).not.toContain("[");
    expect(sitemap).not.toContain("]");
    expect(sitemap).not.toContain("& ");
  });
});
