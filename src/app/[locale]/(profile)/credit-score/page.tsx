import CreditScorePageClient from "@/features/credit-score/CreditScorePageClient";
import SubPage from "@/features/profile/layout/SubPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "creditScore" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CreditScorePage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);
  return (
    <SubPage title="navCreditScore" showSubMenu>
      <CreditScorePageClient />
    </SubPage>
  );
}
