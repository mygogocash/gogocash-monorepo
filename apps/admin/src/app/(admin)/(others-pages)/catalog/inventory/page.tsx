import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default function CatalogInventoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Catalog Inventory" items={[{ label: "Home", href: "/" }, { label: "Catalog", href: "/catalog" }, { label: "Inventory" }]} />
      <CatalogManagementClient section="inventory" />
    </div>
  );
}
