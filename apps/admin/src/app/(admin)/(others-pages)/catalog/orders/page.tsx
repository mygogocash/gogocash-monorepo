import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default function CatalogOrdersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Commerce Orders" items={[{ label: "Home", href: "/" }, { label: "Catalog", href: "/catalog" }, { label: "Orders" }]} />
      <CatalogManagementClient section="orders" />
    </div>
  );
}
