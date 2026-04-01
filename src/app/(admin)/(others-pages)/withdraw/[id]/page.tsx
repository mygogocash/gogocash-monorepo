import { Suspense } from "react";
import WithdrawDetail from "@/components/withdraw/WithdrawDetail";
import WithdrawDetailPageHeader from "@/components/withdraw/WithdrawDetailPageHeader";
import { mockUsers, mockWithdraws } from "@/app/api/mock/data";

/** Pre-render withdraw detail paths for static export (Firebase Hosting). */
export function generateStaticParams() {
  if (process.env.BUILD_FOR_FIREBASE !== "1") {
    return [];
  }
  const ids = new Map<string, true>();
  for (const w of mockWithdraws) ids.set(w._id, true);
  for (const u of mockUsers) ids.set(u._id, true);
  return [...ids.keys()].map((id) => ({ id }));
}

/**
 * Breadcrumbs are resolved on the client from `?from=users` (User management) vs
 * default withdraw list (`?from=withdraw` or no query), so static export stays valid.
 */
export default async function WithdrawDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <div>
      <WithdrawDetailPageHeader />
      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
              Loading…
            </div>
          }
        >
          <WithdrawDetail />
        </Suspense>
      </div>
    </div>
  );
}
