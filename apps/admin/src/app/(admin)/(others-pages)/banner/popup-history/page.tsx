import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import BannerSubNav from "@/components/banner/BannerSubNav";
import BannerInactiveSlotsSection from "@/components/banner/BannerInactiveSlotsSection";
import PopupHistoryTable from "@/components/banner/PopupHistoryTable";
import type { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Popup history | GoGoCash Admin",
  description: "Modal popup snapshots and inactive home or page-banner placements.",
};

const items: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Page Banner", href: "/banner" },
  { label: "Popup history" },
];

export default async function BannerPopupHistoryPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Popup history" items={items} />
      <div className="space-y-6">
        <BannerSubNav />
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Modal popup snapshots</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Stored in this browser when you click <strong>Save configuration</strong> on Modal popups. For production, sync
              with your API.
            </p>
          </div>
          <PopupHistoryTable />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inactive banner slots</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review <strong>empty</strong>, <strong>incomplete</strong>, <strong>disabled</strong>, or <strong>ended</strong> placements from Home Page Banner and every Page Banners target. All statuses remain visible on their main banner tables too.
            </p>
          </div>
          <BannerInactiveSlotsSection />
        </div>
      </div>
    </div>
  );
}
