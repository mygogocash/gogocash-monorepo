import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default function CatalogProductsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Catalog Products" items={[{ label: "Home", href: "/" }, { label: "Catalog", href: "/catalog" }, { label: "Products" }]} />
      <CatalogManagementClient section="products" />
    </div>
  );
}
