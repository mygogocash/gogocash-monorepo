import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WithdrawDetail from "@/components/withdraw/WithdrawDetail";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";

type SearchParams = Promise<{ from?: string; name?: string }>;

function buildBreadcrumbItems(searchParams: Awaited<SearchParams>): BreadcrumbItem[] {
  const from = searchParams?.from;
  const name = searchParams?.name ? decodeURIComponent(searchParams.name) : undefined;

  const home = { label: "Home", href: "/" };

  if (from === "users" && name) {
    return [
      home,
      { label: "Users", href: "/users" },
      { label: name },
      { label: "Detail" },
    ];
  }

  if (from === "withdraw") {
    return [
      home,
      { label: "Withdraw", href: "/withdraw" },
      { label: "Detail" },
    ];
  }

  // Default: same as from withdraw list
  return [
    home,
    { label: "Withdraw", href: "/withdraw" },
    { label: "Detail" },
  ];
}

export default async function WithdrawDetailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const items = buildBreadcrumbItems(resolved);

  return (
    <div>
      <PageBreadcrumb pageTitle="Detail" items={items} />
      <div className="space-y-6">
        <WithdrawDetail />
      </div>
    </div>
  );
}
