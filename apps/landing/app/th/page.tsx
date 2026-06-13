import type { Metadata } from "next";
import ThaiHomePage from "@/components/thai-home-page";
import { fetchPartnerBrands } from "@/lib/involve-asia";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";

export const metadata: Metadata = {
  title: "GoGoCash — รับแคชแบ็กสูงสุด 30% ช้อปออนไลน์ SEA",
  description:
    "ช้อป Shopee Lazada Agoda และแบรนด์พันธมิตรกว่า 70 แบรนด์ รับแคชแบ็กจริงผ่าน GoGoCash ใช้ฟรี เริ่มจากลิงก์หรือมินิแอปแล้วช้อปตามปกติ",
  alternates: { canonical: "/th", languages: HREFLANG_LANDING_ALTERNATES },
  openGraph: {
    locale: "th_TH",
    title: "GoGoCash — แคชแบ็กจริงทั่วเอเชียตะวันออกเฉียงใต้",
    description:
      "แพลตฟอร์มช้อปแล้วได้เงินคืน เริ่มจาก GoGoCash แล้วไปชำระเงินที่แบรนด์พันธมิตร",
  },
};

/** Thai landing mirrors the English homepage structure; partners load at build time. */
export default async function ThaiLandingPage() {
  const partners = await fetchPartnerBrands();
  return <ThaiHomePage initialPartners={partners} />;
}
