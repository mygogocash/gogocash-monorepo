import OffersManagementPageContent from "@/components/offer/OffersManagementPageContent";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Brands Management | GoGoCash Admin",
};

function OffersManagementFallback() {
  return (
    <div className="space-y-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export default async function OffersPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <Suspense fallback={<OffersManagementFallback />}>
      <OffersManagementPageContent />
    </Suspense>
  );
}
