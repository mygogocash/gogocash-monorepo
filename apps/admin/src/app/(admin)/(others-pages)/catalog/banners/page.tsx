import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default function CatalogBannersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Catalog Banners" items={[{ label: "Home", href: "/" }, { label: "Catalog", href: "/catalog" }, { label: "Banners" }]} />
      <CatalogManagementClient section="banners" />
    </div>
  );
}
