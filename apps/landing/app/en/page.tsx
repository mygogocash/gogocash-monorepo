import type { Metadata } from "next";
import HomePage from "@/components/home-page";
import { fetchPartnerBrands } from "@/lib/involve-asia";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";
import {
  SOCIAL_PREVIEW_DESCRIPTION,
  SOCIAL_PREVIEW_TITLE,
} from "@/lib/social-preview";

/** Same content as `/`; canonical points home to avoid duplicate English URLs in search. */
export const metadata: Metadata = {
  title: SOCIAL_PREVIEW_TITLE,
  description: SOCIAL_PREVIEW_DESCRIPTION,
  alternates: { canonical: "/", languages: HREFLANG_LANDING_ALTERNATES },
  openGraph: {
    locale: "en_US",
    title: SOCIAL_PREVIEW_TITLE,
    description: SOCIAL_PREVIEW_DESCRIPTION,
  },
};

export default async function EnglishPage() {
  const partners = await fetchPartnerBrands();
  return <HomePage initialPartners={partners} />;
}
