import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PlatformActivityTable from "@/components/activity/PlatformActivityTable";
import { Metadata } from "next";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Platform Activity | GoGoCash Admin",
};

export default async function PlatformActivityPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Platform Activity" />
      <PlatformActivityTable />
    </div>
  );
}
