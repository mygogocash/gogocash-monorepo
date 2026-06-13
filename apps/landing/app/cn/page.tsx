import type { Metadata } from "next";
import CnHomePage from "@/components/cn-home-page";
import { fetchPartnerBrands } from "@/lib/involve-asia";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";

export const metadata: Metadata = {
  title: "GoGoCash — 东南亚最高 30% 现金回馈｜简体中文",
  description:
    "通过 GoGoCash 在 Shopee、Lazada、Agoda 等 70+ 品牌赚真实现金回馈。免费使用，从链接或 Mini App 开始购物即可。",
  alternates: { canonical: "/cn", languages: HREFLANG_LANDING_ALTERNATES },
  openGraph: {
    locale: "zh_CN",
    title: "GoGoCash — 东南亚现金回馈平台",
    description:
      "从 GoGoCash 前往合作商家消费，订单确认后享现金回馈。Telegram／LINE 迷你应用程序与网页皆可使用。",
  },
};

export default async function ChinaLandingPage() {
  const partners = await fetchPartnerBrands();
  return <CnHomePage initialPartners={partners} />;
}
