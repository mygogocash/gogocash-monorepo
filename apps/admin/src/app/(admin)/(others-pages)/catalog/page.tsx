import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default function CatalogPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Catalog" items={[{ label: "Home", href: "/" }, { label: "Catalog" }]} />
      <CatalogManagementClient section="overview" />
    </div>
  );
}
