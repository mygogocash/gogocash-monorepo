import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import FeeForm from "@/components/fee/FeeForm";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
};

export default async function FeePage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Fee" />
      <div className="space-y-6">
        <FeeForm />
      </div>
    </div>
  );
}
