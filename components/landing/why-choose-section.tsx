import { Sparkles, Merchant, Coins, MessageCircle, Trophy } from "@/components/icons";
import { SITE_FACTS } from "@/lib/site-facts";
import { WhyChooseMarketingSection } from "@/components/landing/why-choose-marketing-section";

const WHY_CARDS = [
  {
    title: "Cashback you can feel in your wallet",
    body:
      "Balance goes up after the brand confirms — spend it or grow it with Saving Plus.",
    link: { label: "What is Saving Plus?", href: "/learn/saving-plus-explained" },
  },
  {
    title: "Brands you already trust",
    body: `Earn at ${SITE_FACTS.partnerCountLabel} partners across SEA with rates shown before you checkout.`,
  },
  {
    title: "Quests that match how you shop",
    body:
      "Seasonal challenges and boosts so everyday spends stack faster.",
  },
  {
    title: "Humans when something's unclear",
    body:
      "Tracking, timing, or withdrawals — chat or email us any time.",
  },
] as const;

const WHY_ICONS = [Coins, Merchant, Trophy, MessageCircle] as const;
const WHY_BG = ["bg-mint", "bg-cream", "bg-cream", "bg-mint"] as const;

export default function WhyChooseSection() {
  return (
    <WhyChooseMarketingSection
      badgeIcon={<Sparkles className="h-4 w-4" />}
      badgeLabel="Why GoGoCash"
      title="Why shoppers stick with GoGoCash"
      subtitle="Real money back on familiar brands, clear timing, and rewards you can withdraw — on web and in our mini apps."
      cards={WHY_CARDS}
      iconComponents={WHY_ICONS}
      cardBackgrounds={WHY_BG}
    />
  );
}
