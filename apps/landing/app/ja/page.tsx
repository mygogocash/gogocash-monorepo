import type { Metadata } from "next";
import JaHomePage from "@/components/ja-home-page";
import { fetchPartnerBrands } from "@/lib/involve-asia";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";

export const metadata: Metadata = {
  title: "GoGoCash — 最大30%キャッシュバック｜東南アジア向け（日本語）",
  description:
    "Shopee、Lazada、Agoda など 70 以上のストアで GoGoCash 経由のお買い物でリアルキャッシュバック。無料で利用開始。",
  alternates: { canonical: "/ja", languages: HREFLANG_LANDING_ALTERNATES },
  openGraph: {
    locale: "ja_JP",
    title: "GoGoCash — 東南アジアで使えるキャッシュバック",
    description:
      "GoGoCash から提携店で購入し、注文確定後にキャッシュバック。Telegram / LINE ミニアプリと Web に対応。",
  },
};

export default async function JapanLandingPage() {
  const partners = await fetchPartnerBrands();
  return <JaHomePage initialPartners={partners} />;
}
