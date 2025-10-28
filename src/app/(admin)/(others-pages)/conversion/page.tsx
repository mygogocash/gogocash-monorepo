import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import ConversionTable from "@/components/conversion/ConversionTable";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
  description: "Browse and manage offers",
};

export default function ConversionPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Conversion" />
      <div className="space-y-6">
        <ConversionTable />
      </div>
    </div>
  );
}
