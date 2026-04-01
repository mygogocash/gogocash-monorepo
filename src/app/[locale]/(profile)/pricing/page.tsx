import PricingPageClient from "@/features/subscription/components/PricingPageClient";
import SubPage from "@/features/profile/layout/SubPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "subscription" });
  return {
    title: t("metaPricingTitle"),
  };
}

export default async function PricingPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);

  return (
    <SubPage title="subscriptionPricingTitle" showSubMenu>
      <PricingPageClient />
    </SubPage>
  );
}
