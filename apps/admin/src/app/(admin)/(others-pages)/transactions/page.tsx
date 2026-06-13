import TransactionsManagement from "@/components/transaction/TransactionsManagement";
import ConversionSubNav from "@/components/conversion/ConversionSubNav";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Transactions | GoGoCash Admin",
};

export default async function TransactionsPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb pageTitle="Transactions" items={[{ label: "Home", href: "/" }, { label: "Transactions" }]} />
      <div className="mt-6 space-y-6">
        <Suspense
          fallback={
            <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" aria-hidden />
          }
        >
          <ConversionSubNav />
        </Suspense>
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          }
        >
          <TransactionsManagement />
        </Suspense>
      </div>
    </div>
  );
}
