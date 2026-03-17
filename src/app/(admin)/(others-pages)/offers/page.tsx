import OffersTable from "@/components/offer/OffersTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
};

export default function OffersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Offers" />
      <div className="space-y-6">
        <OffersTable />
      </div>
    </div>
  );
}
