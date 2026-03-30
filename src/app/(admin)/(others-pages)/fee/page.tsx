import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import FeeForm from "@/components/fee/FeeForm";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
};

export default function FeePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Fee" />
      <div className="space-y-6">
        <FeeForm />
      </div>
    </div>
  );
}
