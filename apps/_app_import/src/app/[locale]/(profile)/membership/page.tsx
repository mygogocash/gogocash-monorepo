import MembershipCheckoutNotifier from "@/features/membership/MembershipCheckoutNotifier";
import MembershipPageClient from "@/features/membership/MembershipPageClient";
import SubPage from "@/features/profile/layout/SubPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "membership" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function MembershipPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);

  return (
    <SubPage title="navMembership" showSubMenu>
      <Suspense fallback={null}>
        <MembershipCheckoutNotifier />
      </Suspense>
      <MembershipPageClient />
    </SubPage>
  );
}
