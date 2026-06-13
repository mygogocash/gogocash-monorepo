/**
 * Single source of truth for homepage FAQ + FAQPage JSON-LD.
 * Answers: first sentence = direct answer (AEO); then supporting detail; aim under ~300 chars where possible.
 */
export type FaqEntry = { question: string; answer: string };

export const FAQ_ITEMS: FaqEntry[] = [
  {
    question: "How does GoGoCash cashback work?",
    answer:
      "You earn cashback when you start shopping from GoGoCash and the brand later confirms your order. Browse partners in the app or on the site, tap through to the merchant, check out as usual, and GoGoCash credits your wallet after confirmation so you can withdraw at the minimum shown.",
  },
  {
    question: "How long does cashback take to confirm?",
    answer:
      "Most cashback confirms within 1–3 business days after the partner validates your purchase. Peak sale periods or travel bookings can take longer because the merchant confirms later.",
  },
  {
    question: "How do I withdraw my cashback?",
    answer:
      "Withdraw from your GoGoCash wallet to a supported bank account or e-wallet once you meet the in-app minimum. Most payouts complete within 1–3 business days depending on the method and country.",
  },
  {
    question: "Is GoGoCash free to use?",
    answer:
      "Yes — GoGoCash is free to use. There are no subscription fees or hidden platform charges; you earn cashback when you shop through eligible partner journeys.",
  },
  {
    question: "What is the minimum withdrawal amount on GoGoCash?",
    answer:
      "Your minimum withdrawal is shown inside your GoGoCash wallet and can vary by country and payout method. Once your confirmed balance meets that threshold, you can request a payout to an eligible bank or e-wallet.",
  },
  {
    question: "Which brands are available?",
    answer:
      "GoGoCash works with 70+ cashback partners across Southeast Asia, including Lazada, Shopee, Agoda, Samsung, and Trip.com — and the in-app brand directory keeps growing. New merchants join over time; check the app or homepage partner list for the latest lineup.",
  },
  {
    question: "Which brands offer the highest cashback on GoGoCash?",
    answer:
      "The highest rates change by campaign and category. Open GoGoCash and compare the live rate on each merchant tile before you shop — that is the source of truth for your session.",
  },
  {
    question: "Can I use GoGoCash in Thailand, Indonesia, or Malaysia?",
    answer:
      "Yes — GoGoCash is available across Southeast Asia, including Thailand, Indonesia, Malaysia, Singapore, the Philippines, and Vietnam.",
  },
  {
    question: "What if my cashback doesn’t track?",
    answer:
      "First, confirm you started the whole trip from GoGoCash, kept one clean merchant tab, and disabled strict blockers during checkout. If it still fails, contact support with your order ID and screenshots so we can investigate with the partner.",
  },
  {
    question: "How is GoGoCash different from points programs?",
    answer:
      "GoGoCash pays real cashback to your wallet instead of opaque points with confusing tiers. You see rates upfront, shop as you already do, and withdraw cash when you qualify — no mystery redemption math.",
  },
];
