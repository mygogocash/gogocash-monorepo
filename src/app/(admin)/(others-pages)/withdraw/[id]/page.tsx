import WithdrawDetail from "@/components/withdraw/WithdrawDetail";
import WithdrawDetailPageHeader from "@/components/withdraw/WithdrawDetailPageHeader";
import { mockWithdraws } from "@/app/api/mock/data";
import { awaitPageDynamicProps, type AppPageRouteParams } from "@/lib/nextAppPageProps";

/** Pre-render withdraw detail paths for static export (Firebase Hosting). */
export function generateStaticParams() {
  if (process.env.BUILD_FOR_FIREBASE !== "1") {
    return [];
  }
  return mockWithdraws.map((w) => ({ id: w._id }));
}

/**
 * Breadcrumbs are resolved on the client from `?from=users` (User management) vs
 * default withdraw list (`?from=withdraw` or no query), so static export stays valid.
 */
export default async function WithdrawDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AppPageRouteParams>;
}) {
  await awaitPageDynamicProps({ params, searchParams });
  return (
    <div>
      <WithdrawDetailPageHeader />
      <div className="space-y-6">
        <WithdrawDetail />
      </div>
    </div>
  );
}
