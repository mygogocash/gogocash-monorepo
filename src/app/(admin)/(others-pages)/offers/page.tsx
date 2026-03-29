import OffersManagementPageContent from "@/components/offer/OffersManagementPageContent";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Offers Management | GoGoCash Admin",
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

export default function OffersPage() {
  return (
    <Suspense fallback={<OffersManagementFallback />}>
      <OffersManagementPageContent />
    </Suspense>
  );
}
