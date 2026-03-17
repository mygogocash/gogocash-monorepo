import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import ConversionPageClient from "./ConversionPageClient";

export const metadata: Metadata = {
  title: "Conversion | GoGoCash Admin",
};

export default function ConversionPage() {
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Conversion"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Conversion Management" },
          { label: "Conversion" },
        ]}
      />
      <div className="space-y-6">
        <ConversionPageClient />
      </div>
    </div>
  );
}
