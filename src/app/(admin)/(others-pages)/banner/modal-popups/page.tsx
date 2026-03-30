import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import AppOpenPopupSettingsForm from "@/components/banner/AppOpenPopupSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modal popups | GoGoCash Admin",
  description: "Configure app-open modal popups and redirect links.",
};

const items: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Page Banner", href: "/banner" },
  { label: "Modal popups" },
];

export default function BannerModalPopupsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Modal popups" items={items} />
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <AppOpenPopupSettingsForm isActive />
      </div>
    </div>
  );
}
