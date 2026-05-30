"use client";

import Image from "next/image";

type Brand = {
  id: string;
  name: string;
  slug: string;
  category: string;
  cashbackPct: number;
  hasCoupon: boolean;
  logoSlug: string;
  tint: string;
};

const BRANDS: Brand[] = [
  {
    id: "1001",
    name: "Grocery Galaxy",
    slug: "grocery-galaxy",
    category: "Others",
    cashbackPct: 12.5,
    hasCoupon: true,
    logoSlug: "instacart",
    tint: "#16a34a",
  },
  {
    id: "1002",
    name: "Pocket Pantry",
    slug: "pocket-pantry",
    category: "Others",
    cashbackPct: 10.0,
    hasCoupon: true,
    logoSlug: "target",
    tint: "#0ea5e9",
  },
  {
    id: "1003",
    name: "Orbit Airways",
    slug: "orbit-airways",
    category: "Travel",
    cashbackPct: 8.5,
    hasCoupon: false,
    logoSlug: "americanairlines",
    tint: "#0284c7",
  },
  {
    id: "1004",
    name: "PixelPort",
    slug: "pixelport",
    category: "Electronics",
    cashbackPct: 6.5,
    hasCoupon: false,
    logoSlug: "apple",
    tint: "#0f172a",
  },
  {
    id: "1005",
    name: "Glow Atelier",
    slug: "glow-atelier",
    category: "Health & Beauty",
    cashbackPct: 9.0,
    hasCoupon: true,
    logoSlug: "etsy",
    tint: "#ec4899",
  },
  {
    id: "1006",
    name: "WalletBoost",
    slug: "walletboost",
    category: "Others",
    cashbackPct: 5.0,
    hasCoupon: true,
    logoSlug: "paypal",
    tint: "#2563eb",
  },
  {
    id: "1007",
    name: "Chronos Lab",
    slug: "chronos-lab",
    category: "Electronics",
    cashbackPct: 7.5,
    hasCoupon: true,
    logoSlug: "samsung",
    tint: "#6366f1",
  },
  {
    id: "1008",
    name: "ShopQuest",
    slug: "shopquest",
    category: "Travel",
    cashbackPct: 11.0,
    hasCoupon: false,
    logoSlug: "airbnb",
    tint: "#eab308",
  },
  {
    id: "1009",
    name: "NeonDeals",
    slug: "neondeals",
    category: "Others",
    cashbackPct: 4.0,
    hasCoupon: false,
    logoSlug: "shopee",
    tint: "#f97316",
  },
  {
    id: "1010",
    name: "Flux Foods",
    slug: "flux-foods",
    category: "Others",
    cashbackPct: 13.5,
    hasCoupon: true,
    logoSlug: "ubereats",
    tint: "#0f766e",
  },
  {
    id: "1011",
    name: "SkyTunes",
    slug: "skytunes",
    category: "Digital Services",
    cashbackPct: 3.0,
    hasCoupon: false,
    logoSlug: "spotify",
    tint: "#065f46",
  },
  {
    id: "1012",
    name: "NovaMart",
    slug: "novamart",
    category: "Electronics",
    cashbackPct: 6.0,
    hasCoupon: true,
    logoSlug: "ebay",
    tint: "#111827",
  },
  {
    id: "1013",
    name: "Trip Nest",
    slug: "trip-nest",
    category: "Travel",
    cashbackPct: 7.0,
    hasCoupon: false,
    logoSlug: "tripadvisor",
    tint: "#1d4ed8",
  },
  {
    id: "1014",
    name: "Stream+",
    slug: "stream-plus",
    category: "Digital Services",
    cashbackPct: 4.5,
    hasCoupon: true,
    logoSlug: "netflix",
    tint: "#7f1d1d",
  },
  {
    id: "1015",
    name: "Bright Gym",
    slug: "bright-gym",
    category: "Health & Beauty",
    cashbackPct: 8.0,
    hasCoupon: false,
    logoSlug: "nike",
    tint: "#1f2937",
  },
  {
    id: "1016",
    name: "Cozy Stays",
    slug: "cozy-stays",
    category: "Travel",
    cashbackPct: 9.5,
    hasCoupon: true,
    logoSlug: "expedia",
    tint: "#facc15",
  },
];

function CouponPill() {
  return (
    <div className="absolute left-2 top-2 flex h-6 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-normal leading-none text-gray-800 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.05)]">
      <span aria-hidden="true" className="text-[13px] leading-none">
        🧧
      </span>
      <span className="min-w-0 truncate">Grab Coupon</span>
    </div>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      {label}
    </span>
  );
}

function HeartButton() {
  return (
    <button
      type="button"
      aria-label="Save to favorites"
      className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-rose-500"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="size-4"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </button>
  );
}

type BrandCardVariant = "square" | "banner";

function BrandCard({
  brand,
  variant,
  dense,
}: {
  brand: Brand;
  variant: BrandCardVariant;
  dense: boolean;
}) {
  const logoUrl = `https://cdn.simpleicons.org/${brand.logoSlug}/ffffff`;
  const imageAspect = variant === "square" ? "aspect-square" : "aspect-[272/153]";
  const imageFit =
    variant === "square" ? (dense ? "object-contain p-3" : "object-contain p-6") : "object-cover";

  return (
    <a
      href={`/en/shop/brand-${brand.slug}-${brand.id}`}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition hover:shadow-md"
    >
      <div
        className={`relative w-full shrink-0 overflow-hidden rounded-lg ${imageAspect}`}
        style={{ backgroundColor: brand.tint }}
      >
        <Image
          src={logoUrl}
          alt={brand.name}
          fill
          unoptimized
          sizes="(max-width: 767px) 70vw, (max-width: 1023px) 33vw, 228px"
          className={imageFit}
        />
        {brand.hasCoupon && !dense ? <CouponPill /> : null}
      </div>

      {dense ? (
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 pt-2">
          <h3 className="truncate text-xs font-semibold text-gray-900">{brand.name}</h3>
          <span className="text-sm font-bold text-emerald-600">
            {brand.cashbackPct.toFixed(1)}%
          </span>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1 pt-3">
          <div className="flex w-full items-center gap-2">
            <CategoryPill label={brand.category} />
            <HeartButton />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{brand.name}</h3>
            <span className="shrink-0 text-base font-bold text-emerald-600">
              {brand.cashbackPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">Cashback up to</p>
        </div>
      )}
    </a>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {title} <span aria-hidden="true">🔥</span>
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      <a href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
        View all →
      </a>
    </div>
  );
}

type DesktopCols = 4 | 5 | 6 | 8;

const LG_COLS_MAP: Record<DesktopCols, string> = {
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  8: "lg:grid-cols-8",
};

function BrandGrid({
  variant,
  desktopCols,
}: {
  variant: BrandCardVariant;
  desktopCols: DesktopCols;
}) {
  const lgColsClass = LG_COLS_MAP[desktopCols];
  const dense = desktopCols >= 6;
  return (
    <>
      <div className={`hidden grid-cols-2 gap-3 sm:grid-cols-3 md:grid md:gap-4 ${lgColsClass}`}>
        {BRANDS.map((brand) => (
          <BrandCard key={brand.id} brand={brand} variant={variant} dense={dense} />
        ))}
      </div>

      <div className="md:hidden">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BRANDS.map((brand) => (
            <div key={brand.id} className="w-[70vw] max-w-[280px] shrink-0 snap-start">
              <BrandCard brand={brand} variant={variant} dense={false} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function TopBrandsSquareDemo() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8">
      <section>
        <SectionHeader
          title="Top Brands — 5 col"
          subtitle="1:1 logos • 5-col desktop — recommended default"
        />
        <BrandGrid variant="square" desktopCols={5} />
      </section>

      <hr className="border-dashed border-gray-300" />

      <section>
        <SectionHeader
          title="Top Brands — 6 col"
          subtitle="1:1 logos • 6-col desktop — compact meta (name + cashback only)"
        />
        <BrandGrid variant="square" desktopCols={6} />
      </section>

      <hr className="border-dashed border-gray-300" />

      <section>
        <SectionHeader
          title="Top Brands — 8 col"
          subtitle="1:1 logos • 8-col desktop — icon-dense row, logos read as badges"
        />
        <BrandGrid variant="square" desktopCols={8} />
      </section>

      <hr className="border-dashed border-gray-300" />

      <section>
        <SectionHeader
          title="Top Brands — 4 col"
          subtitle="1:1 logos • 4-col desktop (cards feel bigger, section is taller)"
        />
        <BrandGrid variant="square" desktopCols={4} />
      </section>

      <hr className="border-dashed border-gray-300" />

      <section>
        <SectionHeader
          title="Top Brands — Current"
          subtitle="Current — 272:153 banner • 4-col desktop (visual diff reference)"
        />
        <BrandGrid variant="banner" desktopCols={4} />
      </section>
    </div>
  );
}
