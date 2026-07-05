import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssetsBySlug,
  lookupMatchesSlug,
  planOfferMediaUpdates,
} from "./offer-media-field-map.mjs";

test("buildAssetsBySlug > keeps logo-circle and shop-page-banner per slug", () => {
  const map = buildAssetsBySlug([
    {
      slug: "agoda",
      category: "logo-circle",
      relativePath: "docs/assets/brand-logos/agoda/logo-circle/logo.png",
    },
    {
      slug: "agoda",
      category: "shop-page-banner",
      relativePath: "docs/assets/brand-logos/agoda/shop-page-banner/logo.png",
    },
    {
      slug: "agoda",
      category: "default-shop-card",
      relativePath: "docs/assets/brand-logos/agoda/default-shop-card/logo.png",
    },
  ]);

  assert.equal(map.size, 1);
  assert.deepEqual(map.get("agoda"), {
    "logo-circle": "docs/assets/brand-logos/agoda/logo-circle/logo.png",
    "shop-page-banner":
      "docs/assets/brand-logos/agoda/shop-page-banner/logo.png",
  });
});

test("lookupMatchesSlug > matches exact and country-suffixed lookup values", () => {
  assert.equal(lookupMatchesSlug("klook_travel", "klook_travel"), true);
  assert.equal(lookupMatchesSlug("agoda_th", "agoda"), true);
  assert.equal(lookupMatchesSlug("shopee_th", "shopee_th"), true);
  assert.equal(lookupMatchesSlug("nike_us", "adidas"), false);
});

test("planOfferMediaUpdates > maps categories to FormOffer offer fields", () => {
  const plans = planOfferMediaUpdates({
    "logo-circle": "docs/assets/brand-logos/agoda/logo-circle/logo.png",
    "shop-page-banner":
      "docs/assets/brand-logos/agoda/shop-page-banner/logo.png",
  });

  assert.equal(plans.length, 2);
  assert.deepEqual(plans[0].offerFields, ["logo_desktop", "logo_mobile"]);
  assert.deepEqual(plans[1].offerFields, ["logo_circle"]);
});
