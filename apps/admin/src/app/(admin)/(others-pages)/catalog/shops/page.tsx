import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default function CatalogShopsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Catalog Shops" items={[{ label: "Home", href: "/" }, { label: "Catalog", href: "/catalog" }, { label: "Shops" }]} />
      <CatalogManagementClient section="shops" />
    </div>
  );
}
