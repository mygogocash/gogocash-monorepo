import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WithdrawDetail from "@/components/withdraw/WithdrawDetail";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import { mockWithdraws } from "@/app/api/mock/data";

/** Pre-render withdraw detail paths for static export (Firebase Hosting). */
export function generateStaticParams() {
  if (process.env.BUILD_FOR_FIREBASE !== "1") {
    return [];
  }
  return mockWithdraws.map((w) => ({ id: w._id }));
}

function defaultBreadcrumbItems(): BreadcrumbItem[] {
  const home = { label: "Home", href: "/" };
  return [
    home,
    { label: "Withdraw", href: "/withdraw" },
    { label: "Detail" },
  ];
}

/**
 * Static export cannot use `searchParams` on the server. Breadcrumb uses the default
 * withdraw trail; refine via a client child later if needed.
 */
export default function WithdrawDetailPage() {
  const items = defaultBreadcrumbItems();

  return (
    <div>
      <PageBreadcrumb pageTitle="Detail" items={items} />
      <div className="space-y-6">
        <WithdrawDetail />
      </div>
    </div>
  );
}
