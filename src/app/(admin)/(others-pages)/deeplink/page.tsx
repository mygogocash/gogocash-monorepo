import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DeeplinkTable from "@/components/deeplink/DeeplinkTable";

export const metadata: Metadata = {
  title: "Deeplink | GoGoCash Admin",
};

export default function DeeplinkPage() {
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Deeplink"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Deeplink Home" },
          { label: "Deeplink Lists" },
        ]}
      />
      <div className="space-y-6">
        <DeeplinkTable />
      </div>
    </div>
  );
}
