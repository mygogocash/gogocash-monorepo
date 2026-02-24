import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestTable from "@/components/quest/QuestTable";

export default function QuestPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Quest" />
      <div className="space-y-6">
        <QuestTable />
      </div>
    </div>
  );
}
