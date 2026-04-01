import { Metadata } from "next";
import { Suspense } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AddConversionForm from "@/components/conversion/AddConversionForm";
import ConversionSubNav from "@/components/conversion/ConversionSubNav";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

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
        <Suspense
          fallback={
            <div className="h-[46px] border-b border-gray-200 dark:border-gray-700" aria-hidden />
          }
        >
          <ConversionSubNav />
        </Suspense>
        <AddConversionForm />
      </div>
    </div>
  );
}
