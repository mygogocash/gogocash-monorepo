/** Cap for home Top Brands swiper (`CardSlideCategory` `maxItems`). */
export const HOME_TOP_BRANDS_CAROUSEL_MAX = 24;

export const homeSectionMeta = {
  topBrands: {
    title: "Top Brands",
    link: "/brand",
    trackingListId: "home_top_brands",
    trackingListName: "Top Brands",
  },
  trendingBrands: {
    title: "Trending Brands",
    link: "/brand",
    trackingListId: "home_trending_brands",
    trackingListName: "Trending Brands",
  },
  specialPick: {
    title: "Special Pick for You!",
    link: "/brand",
    trackingListId: "home_special_pick_for_you",
    trackingListName: "Special Pick for You!",
  },
  popularNow: {
    title: "What's Popular Now?!",
    link: "/category",
  },
  travelDeals: {
    title: "Travel Deals are Here!",
    link: "/category/Travel",
    trackingListId: "home_travel_deals",
    trackingListName: "Travel Deals are Here!",
  },
  makeupMustHave: {
    title: "Makeup Must Have!",
    link: "/category/Health & Beauty",
    trackingListId: "home_makeup_must_have",
    trackingListName: "Makeup Must Have!",
  },
  browseShortcuts: {
    title: "Browse",
  },
} as const;
