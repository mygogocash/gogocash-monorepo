import { Metadata } from "next";
import Detail from "@/components/offer/Detail";
import { mockOffers } from "@/app/api/mock/data";
import { awaitPageDynamicProps, type AppPageRouteParams } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
};

/** Pre-render offer detail paths for static export (Firebase Hosting). */
export function generateStaticParams() {
  if (process.env.BUILD_FOR_FIREBASE !== "1") {
    return [];
  }
  return mockOffers.map((o) => ({ id: o._id }));
}

export default async function OffersDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AppPageRouteParams>;
}) {
  await awaitPageDynamicProps({ params, searchParams });
  return (
    <div className="space-y-6">
      <Detail />
    </div>
  );
}
