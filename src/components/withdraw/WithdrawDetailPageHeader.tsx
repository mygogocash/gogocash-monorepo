"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";

const DEFAULT_ITEMS: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Withdraw", href: "/withdraw" },
  { label: "Detail" },
];

function WithdrawDetailPageHeaderInner() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const nameRaw = searchParams.get("name");

  let displayName: string | null = null;
  if (nameRaw?.trim()) {
    try {
      displayName = decodeURIComponent(nameRaw.replace(/\+/g, " ").trim());
    } catch {
      displayName = nameRaw.trim();
    }
  }

  // Origin-aware breadcrumb: the middle crumb links back to where the user
  // came from (Users / MyCashBack Users), so the flow is reversible.
  const origin: BreadcrumbItem | null =
    from === "users"
      ? { label: "GoGoCash Users", href: "/users" }
      : from === "mycashback"
        ? { label: "MyCashBack Users", href: "/users/mycashback" }
        : null;

  if (origin) {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      origin,
      { label: "Detail" },
    ];
    return (
      <PageBreadcrumb pageTitle={displayName ?? "User detail"} items={items} />
    );
  }

  return <PageBreadcrumb pageTitle="Detail" items={DEFAULT_ITEMS} />;
}

function BreadcrumbFallback() {
  return <PageBreadcrumb pageTitle="Detail" items={DEFAULT_ITEMS} />;
}

export default function WithdrawDetailPageHeader() {
  return (
    <Suspense fallback={<BreadcrumbFallback />}>
      <WithdrawDetailPageHeaderInner />
    </Suspense>
  );
}
