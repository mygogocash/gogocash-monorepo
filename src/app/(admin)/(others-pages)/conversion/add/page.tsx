import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";
import AddConversionForm from "@/components/conversion/AddConversionForm";

export const metadata: Metadata = {
  title: "Add Conversion | GoGoCash Admin",
};

export default async function AddConversionPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Add conversion"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Conversion Management", href: "/conversion" },
          { label: "Add conversion" },
        ]}
      />
      <div className="space-y-6">
        <AddConversionForm />
      </div>
    </div>
  );
}
