import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateBrandForm from "@/components/offer/CreateBrandForm";
import OffersManagementTabs from "@/components/offer/OffersManagementTabs";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Create brand | GoGoCash Admin",
};

export default async function CreateBrandPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Create brand"
        items={[
          { label: "Home", href: "/" },
          { label: "Offers Management", href: "/offers" },
          { label: "Create brand" },
        ]}
      />
      <div className="mt-6 space-y-6">
        <OffersManagementTabs />
        <CreateBrandForm />
      </div>
    </div>
  );
}
