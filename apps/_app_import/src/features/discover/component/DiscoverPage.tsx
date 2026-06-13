"use client";

import { DiscoverContentArea } from "@/features/discover/component/DiscoverContentArea";
import { DiscoverMobileFilterChips } from "@/features/discover/component/DiscoverMobileFilterChips";
import { DiscoverSidebar } from "@/features/discover/component/DiscoverSidebar";
import type { DiscoverFilters } from "@/features/discover/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function DiscoverPage() {
  const t = useTranslations();
  const [filters, setFilters] = useState<DiscoverFilters>({
    category: "",
    minCashback: 0,
    sort: "popular",
    search: "",
  });

  return (
    <section className="gc-home-layout gc-page-block w-full">
      <header className="mb-8 md:mb-10">
        <h1 className="gc-section-title">{t("discoverPageTitle")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--gc-text-muted)]">
          {t("discoverPageSubtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <DiscoverSidebar filters={filters} onChange={setFilters} />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <DiscoverMobileFilterChips filters={filters} onChange={setFilters} />
          <DiscoverContentArea filters={filters} onChange={setFilters} />
        </div>
      </div>
    </section>
  );
}
