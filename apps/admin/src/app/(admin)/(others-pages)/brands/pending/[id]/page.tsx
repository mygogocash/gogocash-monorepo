import PendingOfferReviewRouteClient from "@/components/offer/PendingOfferReviewRouteClient";
import { getDefaultMockPendingOffers } from "@/data/mockPendingOffers";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Review pending brand | GoGoCash Admin",
};

/** Pre-render pending review paths for static export (Firebase Hosting). */
export function generateStaticParams() {
  if (process.env.BUILD_FOR_FIREBASE !== "1") {
    return [];
  }
  return getDefaultMockPendingOffers().map((o) => ({ id: o._id }));
}

function PendingReviewFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export default async function PendingOfferReviewPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  const params = await props.params;
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? "";
  return (
    <Suspense fallback={<PendingReviewFallback />}>
      <PendingOfferReviewRouteClient offerId={id} />
    </Suspense>
  );
}
