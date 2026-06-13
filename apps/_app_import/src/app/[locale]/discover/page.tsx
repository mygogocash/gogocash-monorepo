import DiscoverPage from "@/features/discover/component/DiscoverPage";
import { consumeAppDynamicProps } from "@/lib/next/consumeAppDynamicProps";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("discoverMetaTitle"),
    description: t("discoverMetaDescription"),
  };
}

export default async function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await consumeAppDynamicProps(props);
  return <DiscoverPage />;
}
