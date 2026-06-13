import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import AppOpenPopupSettingsForm from "@/components/banner/AppOpenPopupSettingsForm";
import BannerSubNav from "@/components/banner/BannerSubNav";
import type { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Modal popups | GoGoCash Admin",
  description: "Configure app-open modal popups and redirect links.",
};

const items: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Page Banner", href: "/banner" },
  { label: "Modal popups" },
];

export default async function BannerModalPopupsPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Modal popups" items={items} />
      <div className="space-y-6">
        <BannerSubNav />
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <AppOpenPopupSettingsForm isActive />
        </div>
      </div>
    </div>
  );
}
