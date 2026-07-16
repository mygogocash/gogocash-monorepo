import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import BannerSubNav from "@/components/banner/BannerSubNav";
import SpecificPageBannerManager from "@/components/banner/SpecificPageBannerManager";
import type { Metadata } from "next";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Page Banners | GoGoCash Admin",
  description: "Manage page-targeted carousel banners for customer sub-pages.",
};

const items: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Page Banner", href: "/banner" },
  { label: "Page Banners" },
];

export default async function BannerAllBrandPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Page Banners" items={items} />
      <div className="space-y-6">
        <BannerSubNav />
        <SpecificPageBannerManager />
      </div>
    </div>
  );
}
