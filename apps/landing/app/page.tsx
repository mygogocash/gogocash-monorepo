import HomePage from "@/components/home-page";
import { fetchPartnerBrands } from "@/lib/involve-asia";

/** Partner list is resolved at build time; rebuild to refresh. */
export default async function Page() {
  const partners = await fetchPartnerBrands();
  return <HomePage initialPartners={partners} />;
}
