import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { BreadcrumbItem } from "@/components/common/PageBreadCrumb";
import BannerSubNav from "@/components/banner/BannerSubNav";
import BannerTable from "@/components/banner/BannerTable";
import type { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Specific Page Banner | GoGoCash Admin",
  description:
    "Manage page-targeted carousel banners for customer sub-pages.",
};

const items: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Page Banner", href: "/banner" },
  { label: "Specific Page Banner" },
];

export default async function BannerAllBrandPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Specific Page Banner" items={items} />
      <div className="space-y-6">
        <BannerSubNav />
        <BannerTable variant="allBrand" />
      </div>
    </div>
  );
}
