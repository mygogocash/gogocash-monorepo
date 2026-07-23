import { describe, expect, it } from "vitest";

import {
  mapOfferCatalogToCompactBrandCards,
  resolveApiLandingRails,
  resolveHomePromoSections,
  resolveLiveBrandCards,
} from "@mobile/account/brandCatalogResource";
import type { OfferListResponse } from "@mobile/api/catalogTypes";

const catalogPayload: OfferListResponse = {
  page: 1,
  limit: 80,
  total: 3,
  totalPages: 1,
  data: [
    {
      _id: "offer-travel",
      offer_name_display: "Klook Travel",
      categories: "Travel",
      commission_store: 3.5,
      logo: "https://cdn.example/klook.png",
      disabled: false,
      status: "approved",
    },
    {
      _id: "offer-beauty",
      offer_name: "Glow Shop",
      categories: "Health & Beauty",
      commission_store: "7",
      disabled: false,
      status: "approved",
    },
    {
      _id: "offer-hidden",
      offer_name: "Hidden Shop",
      categories: "Travel",
      disabled: true,
      status: "approved",
    },
  ],
};

type TestPromoSection = {
  id: string;
  title: string;
  link: string;
  icon?: string;
  cardVariant?: string;
  dotCount?: number;
  cards: readonly { brand: string; cashback: string; tint: string }[];
};

const fallbackSections: readonly TestPromoSection[] = [
  {
    id: "trending",
    title: "Trending Brands",
    link: "/brand",
    cards: [{ brand: "Fixture Trend", cashback: "1%", tint: "#000000" }],
  },
  {
    id: "travel",
    title: "Travel Deals are Here!",
    link: "/category/Travel",
    cards: [{ brand: "Fixture Travel", cashback: "2%", tint: "#111111" }],
  },
  {
    id: "makeup",
    title: "Makeup Must Have!",
    link: "/category/Health%20%26%20Beauty",
    cards: [{ brand: "Fixture Beauty", cashback: "3%", tint: "#222222" }],
  },
];

describe("brand catalog resource", () => {
  it("mapOfferCatalogToCompactBrandCards > given live offers > returns customer shop cards", () => {
    expect(mapOfferCatalogToCompactBrandCards(catalogPayload)).toEqual([
      expect.objectContaining({
        brand: "Klook Travel",
        cashback: "3.5%",
        href: "/shop/offer-travel",
        logoUri: "https://cdn.example/klook.png",
      }),
      expect.objectContaining({
        brand: "Glow Shop",
        cashback: "7%",
        href: "/shop/offer-beauty",
      }),
    ]);
  });

  it("resolveLiveBrandCards > given backend data > prefers live admin-managed brands", () => {
    expect(resolveLiveBrandCards("backend", catalogPayload, fallbackSections[0].cards)).toEqual([
      expect.objectContaining({ brand: "Klook Travel" }),
      expect.objectContaining({ brand: "Glow Shop" }),
    ]);
  });

  it("resolveLiveBrandCards > given empty backend data > returns empty because backend catalog is authoritative", () => {
    expect(
      resolveLiveBrandCards(
        "backend",
        { ...catalogPayload, data: [] },
        fallbackSections[0].cards,
      ),
    ).toEqual([]);
  });

  it("resolveHomePromoSections > given backend catalog > replaces each matching section with live brands", () => {
    const sections = resolveHomePromoSections("backend", catalogPayload, fallbackSections);

    expect(sections.find((section) => section.id === "trending")?.cards).toEqual([
      expect.objectContaining({ brand: "Klook Travel" }),
      expect.objectContaining({ brand: "Glow Shop" }),
    ]);
    expect(sections.find((section) => section.id === "travel")?.cards).toEqual([
      expect.objectContaining({ brand: "Klook Travel" }),
    ]);
    expect(sections.find((section) => section.id === "makeup")?.cards).toEqual([
      expect.objectContaining({ brand: "Glow Shop" }),
    ]);
  });

  it("resolveHomePromoSections > given live brands without a section category match > leaves that section empty", () => {
    const sections = resolveHomePromoSections("backend", {
      ...catalogPayload,
      data: [catalogPayload.data[0]],
    }, fallbackSections);

    expect(sections.find((section) => section.id === "makeup")?.cards).toEqual([]);
  });

  const landingRailsPayload = {
    data: [
      {
        railId: "travel",
        title: "Curated Travel",
        emoji: "🧳",
        link: "/category/Travel?curated=1",
        cardVariant: "brandLogoBadge",
        position: 1,
        data: [
          { _id: "o1", offer_id: 1, brand: "Klook", logo: "https://cdn/k.png", cashback: "6%" },
        ],
        dataDesktop: [
          { _id: "o1", offer_id: 1, brand: "Klook", logo: "https://cdn/k.png", cashback: "6%" },
        ],
        dataMobile: [],
      },
    ],
  };

  it("resolveApiLandingRails > given non-backend source > returns fixture rails", () => {
    const sections = resolveApiLandingRails("fixtures", landingRailsPayload, fallbackSections);
    expect(sections.map((s) => s.id)).toEqual(["trending", "travel", "makeup"]);
    expect(sections.find((s) => s.id === "travel")?.cards).toEqual([
      expect.objectContaining({ brand: "Fixture Travel" }),
    ]);
  });

  it("resolveApiLandingRails > given an unavailable API payload > renders no fixture brands", () => {
    const sections = resolveApiLandingRails("backend", null, fallbackSections);
    expect(sections.map((s) => s.id)).toEqual(["trending", "travel", "makeup"]);
    for (const section of sections) {
      expect(section.cards).toEqual([]);
    }
  });

  it("resolveApiLandingRails > given backend rails with cards > prefers the curated rail and overlays title/link/icon", () => {
    const sections = resolveApiLandingRails("backend", landingRailsPayload, fallbackSections);
    const travel = sections.find((s) => s.id === "travel");
    expect(travel?.title).toBe("Curated Travel");
    expect(travel?.link).toBe("/category/Travel?curated=1");
    expect(travel?.icon).toBe("🧳");
    expect(travel?.cards).toEqual([
      expect.objectContaining({ brand: "Klook", cashback: "6%", logoUri: "https://cdn/k.png" }),
    ]);
  });

  it("resolveApiLandingRails > given a rail the API does not curate > renders that rail with no cards", () => {
    const sections = resolveApiLandingRails("backend", landingRailsPayload, fallbackSections);
    expect(sections.find((s) => s.id === "trending")?.cards).toEqual([]);
  });

  it("resolveApiLandingRails > given an empty curated rail > renders that rail with no cards", () => {
    const emptyRail = {
      data: [{ railId: "makeup", title: "Makeup Must Have!", link: "/x", data: [], dataDesktop: [], dataMobile: [] }],
    };
    const sections = resolveApiLandingRails("backend", emptyRail, fallbackSections);
    expect(sections.find((s) => s.id === "makeup")?.cards).toEqual([]);
  });
});
