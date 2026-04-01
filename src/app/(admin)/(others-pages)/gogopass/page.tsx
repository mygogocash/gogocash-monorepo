import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "GoGoPass | GoGoCash Admin",
  description: "GoGoPass membership program administration",
};

export default async function GoGoPassPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb
        pageTitle="GoGoPass"
        items={[
          { label: "Home", href: "/" },
          { label: "GoGoPass" },
        ]}
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Membership program</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage GoGoPass tiers, benefits, and member eligibility. Connect your backend APIs here when
          ready; this page is a shell for the membership program.
        </p>
      </div>
    </div>
  );
}
