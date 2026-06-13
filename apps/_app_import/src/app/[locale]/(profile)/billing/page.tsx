import BillingPageClient from "@/features/subscription/components/BillingPageClient";
import BillingPageSkeleton from "@/features/subscription/components/BillingPageSkeleton";
import SubPage from "@/features/profile/layout/SubPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "subscription" });
  return {
    title: t("metaBillingTitle"),
  };
}

export default async function BillingPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);

  return (
    <SubPage title="subscriptionBillingTitle" showSubMenu>
      <Suspense fallback={<BillingPageSkeleton />}>
        <BillingPageClient />
      </Suspense>
    </SubPage>
  );
}
