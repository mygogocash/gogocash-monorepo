import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import BannerSubNav from "@/components/banner/BannerSubNav";
import BannerTable from "@/components/banner/BannerTable";
import type { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "All Brand Page banner | GoGoCash Admin",
  description: "Manage carousel banners for the in-app all-brands listing screen.",
};

const items: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Page Banner", href: "/banner" },
  { label: "All Brand Page banner" },
];

export default async function BannerAllBrandPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="All Brand Page banner" items={items} />
      <div className="space-y-6">
        <BannerSubNav />
        <BannerTable variant="allBrand" />
      </div>
    </div>
  );
}
