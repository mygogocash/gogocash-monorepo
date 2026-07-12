import { describe, expect, it } from "vitest";

import {
  BRAND_LOGO_IMAGE_WIDTH,
  HERO_BANNER_IMAGE_WIDTH,
  SHOP_BANNER_IMAGE_WIDTH,
  SIDE_BANNER_IMAGE_WIDTH,
  optimizedImageUrl,
} from "@mobile/api/optimizedImageUrl";

describe("optimizedImageUrl", () => {
  it("given a staging media URL > then rewrites through the Cloudflare image transform", () => {
    expect(
      optimizedImageUrl("https://media-staging.gogocash.co/banner-home/big.png", {
        width: 1600,
      }),
    ).toBe(
      "https://media-staging.gogocash.co/cdn-cgi/image/width=1600,quality=78,fit=scale-down,format=auto,onerror=redirect/banner-home/big.png",
    );
  });

  it("given an explicit quality > then uses it instead of the default", () => {
    expect(
      optimizedImageUrl("https://media-staging.gogocash.co/brands/logo.png", {
        quality: 60,
        width: 320,
      }),
    ).toBe(
      "https://media-staging.gogocash.co/cdn-cgi/image/width=320,quality=60,fit=scale-down,format=auto,onerror=redirect/brands/logo.png",
    );
  });

  it("given a URL with a query string > then keeps the query on the transformed URL", () => {
    expect(
      optimizedImageUrl("https://media-staging.gogocash.co/brands/logo.png?v=2", {
        width: 320,
      }),
    ).toBe(
      "https://media-staging.gogocash.co/cdn-cgi/image/width=320,quality=78,fit=scale-down,format=auto,onerror=redirect/brands/logo.png?v=2",
    );
  });

  it("given an already-transformed URL > then returns it unchanged (idempotent)", () => {
    const transformed =
      "https://media-staging.gogocash.co/cdn-cgi/image/width=320,quality=78,fit=scale-down,format=auto,onerror=redirect/brands/logo.png";
    expect(optimizedImageUrl(transformed, { width: 1600 })).toBe(transformed);
  });

  it("given non-gogocash-media hosts > then returns them unchanged", () => {
    const untouched = [
      "https://img.involve.asia/ia_logo/803_unjtmslX.png",
      "https://cdn.simpleicons.org/shopee",
      "https://drive.google.com/uc?export=view&id=abc123def456",
      "https://api-staging.gogocash.co/admin/stored-media/stream?ref=x",
      // Production media host is deliberately NOT allowlisted yet — the prod
      // zone's Image Resizing support is unverified, so prod URLs pass through.
      "https://media.gogocash.co/brands/logo.png",
    ];
    for (const url of untouched) {
      expect(optimizedImageUrl(url, { width: 320 })).toBe(url);
    }
  });

  it("given non-http inputs > then returns them unchanged", () => {
    expect(optimizedImageUrl("/brands/logo.png", { width: 320 })).toBe("/brands/logo.png");
    expect(optimizedImageUrl("data:image/png;base64,AAAA", { width: 320 })).toBe(
      "data:image/png;base64,AAAA",
    );
    expect(optimizedImageUrl("", { width: 320 })).toBe("");
    expect(optimizedImageUrl(undefined, { width: 320 })).toBeUndefined();
  });

  it("shared width constants > pin the per-surface transform sizes", () => {
    expect(HERO_BANNER_IMAGE_WIDTH).toBe(1600);
    expect(SIDE_BANNER_IMAGE_WIDTH).toBe(800);
    expect(SHOP_BANNER_IMAGE_WIDTH).toBe(1080);
    expect(BRAND_LOGO_IMAGE_WIDTH).toBe(320);
  });
});
