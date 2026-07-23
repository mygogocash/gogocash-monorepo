import type {
  BannerAdminSurfaceId,
  BannerSlotDescriptor,
  SpecificPageBannerTargetId,
} from "@/types/banner";

export const SPECIFIC_PAGE_BANNER_TARGET_IDS = [
  "all-brands",
  "all-shops",
  "product-discovery",
] as const satisfies readonly SpecificPageBannerTargetId[];

export type BannerAdminSurface = {
  id: BannerAdminSurfaceId;
  kind: "home" | "legacy" | "specific-page";
  label: string;
  queryKey: readonly string[];
  fetchPath: string;
  editHref: string;
  /** Short title for the inactive-slots list on Popup history. */
  listTitle: string;
  tableTitle: string;
  tableSubtitle: string;
  formTitle: string;
  formDescription: string;
  uploadHint: string;
  slots: readonly BannerSlotDescriptor[];
  customerPath?: string;
  customerPlacement?: string;
};

function carouselSlots(area: string): readonly BannerSlotDescriptor[] {
  return ([1, 2, 3] as const).map((slot) => ({
    area,
    label: `Slide No. ${slot}`,
    slot,
  }));
}

function specificPageTarget(input: {
  id: SpecificPageBannerTargetId;
  label: string;
  customerPath: string;
  customerPlacement: string;
}): BannerAdminSurface & {
  id: SpecificPageBannerTargetId;
  kind: "specific-page";
  customerPath: string;
  customerPlacement: string;
} {
  const editHref = `/banner/all-brand-page?target=${input.id}`;
  return {
    ...input,
    kind: "specific-page",
    queryKey: ["banner", "specific-page", input.id],
    fetchPath: `/admin/banner-specific-page/${input.id}`,
    editHref,
    listTitle: `Page Banners — ${input.label}`,
    tableTitle: `${input.label} banners`,
    tableSubtitle: input.customerPlacement,
    formTitle: `${input.label} · Slide No. {slot}`,
    formDescription: `Edit slide No. {slot} for ${input.label}. ${input.customerPlacement}`,
    uploadHint:
      "Choose a banner image (PNG, JPG, or WebP). Wide assets work best in the customer-page carousel.",
    slots: carouselSlots(`${input.label} page carousel`),
  };
}

export const SPECIFIC_PAGE_BANNER_TARGETS = {
  "all-brands": specificPageTarget({
    id: "all-brands",
    label: "All Brands",
    customerPath: "/brand",
    customerPlacement: "Shown above the brand directory.",
  }),
  "all-shops": specificPageTarget({
    id: "all-shops",
    label: "All Shops",
    customerPath: "/shops",
    customerPlacement: "Shown above the shop directory.",
  }),
  "product-discovery": specificPageTarget({
    id: "product-discovery",
    label: "Product Discovery",
    customerPath: "/discover",
    customerPlacement: "Shown above the product discovery results.",
  }),
} as const satisfies Record<SpecificPageBannerTargetId, BannerAdminSurface>;

export function specificPageBannerTargetFromParam(
  value: string | null | undefined,
): SpecificPageBannerTargetId {
  return SPECIFIC_PAGE_BANNER_TARGET_IDS.includes(
    value as SpecificPageBannerTargetId,
  )
    ? (value as SpecificPageBannerTargetId)
    : "all-brands";
}

/**
 * Shared fetch paths and React Query keys for banner admin surfaces.
 * `BannerTable` and `BannerInactiveSlotsSection` must use the same `queryKey` + `fetchPath` so TanStack Query dedupes requests and cache is shared when navigating between pages.
 */
export const BANNER_ADMIN_SURFACES: Record<
  BannerAdminSurfaceId,
  BannerAdminSurface
> = {
  home: {
    id: "home",
    kind: "home",
    label: "Home Page",
    queryKey: ["getBannerHome"],
    fetchPath: "/admin/banner-home",
    editHref: "/banner",
    listTitle: "Home Page Banner",
    tableTitle: "Home Page Banner",
    tableSubtitle:
      "Slots 1–3 are the top sliding carousel. Slots 4–5 are the two smaller banners below it.",
    formTitle: "Home Page Banner · Position {slot}",
    formDescription:
      "Edit homepage position {slot}: positions 1–3 are top carousel slides; positions 4–5 are the lower small banners.",
    uploadHint:
      "Choose a banner image (PNG, JPG, or WebP). Recommended artwork: 1920×1080 (16:9) — other sizes are accepted and fitted. Max upload 32 MB (large PNGs are optimized on save).",
    slots: [
      {
        area: "Top homepage sliding carousel",
        label: "Top carousel slide No. 1",
        slot: 1,
      },
      {
        area: "Top homepage sliding carousel",
        label: "Top carousel slide No. 2",
        slot: 2,
      },
      {
        area: "Top homepage sliding carousel",
        label: "Top carousel slide No. 3",
        slot: 3,
      },
      {
        area: "Below the carousel, left position",
        label: "Lower small banner No. 1 (left)",
        slot: 4,
      },
      {
        area: "Below the carousel, right position",
        label: "Lower small banner No. 2 (right)",
        slot: 5,
      },
    ],
  },
  homeSmall: {
    id: "homeSmall",
    kind: "legacy",
    label: "Legacy Home Small Banner",
    queryKey: ["getBannerHomeSmall"],
    fetchPath: "/admin/banner-home-small",
    editHref: "/banner",
    listTitle: "Legacy home small surface (not managed)",
    tableTitle: "Legacy Home Small Banner",
    tableSubtitle: "Legacy mock-only surface. Use Home Page Banner slots 4–5.",
    formTitle: "Legacy Home Small Banner · Position {slot}",
    formDescription: "This legacy surface has no managed positions.",
    uploadHint: "Use Home Page Banner slots 4–5 instead.",
    slots: [],
  },
  ...SPECIFIC_PAGE_BANNER_TARGETS,
};

export const BANNER_ADMIN_SURFACE_ORDER: BannerAdminSurfaceId[] = [
  "home",
  ...SPECIFIC_PAGE_BANNER_TARGET_IDS,
];
