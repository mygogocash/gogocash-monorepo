import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DeeplinkTable from "@/components/deeplink/DeeplinkTable";

export default function QuestPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Deeplink" />
      <div className="space-y-6">
        <DeeplinkTable />
      </div>
    </div>
  );
}
