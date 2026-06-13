import type { Metadata } from "next";
import TwHomePage from "@/components/tw-home-page";
import { fetchPartnerBrands } from "@/lib/involve-asia";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";

export const metadata: Metadata = {
  title: "GoGoCash — 東南亞最高 30% 現金回饋｜台灣繁中",
  description:
    "透過 GoGoCash 在 Shopee、Lazada、Agoda 等 70+ 品牌賺真實現金回饋。免費使用，從連結或 Mini App 開始購物即可。",
  alternates: { canonical: "/tw", languages: HREFLANG_LANDING_ALTERNATES },
  openGraph: {
    locale: "zh_TW",
    title: "GoGoCash — 東南亞現金回饋平台",
    description:
      "從 GoGoCash 前往合作商家消費，訂單確認後享現金回饋。Telegram／LINE 迷你應用程式與網頁皆可使用。",
  },
};

export default async function TaiwanLandingPage() {
  const partners = await fetchPartnerBrands();
  return <TwHomePage initialPartners={partners} />;
}
