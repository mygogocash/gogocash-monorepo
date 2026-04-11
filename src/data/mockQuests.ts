import type { QuestDetails } from "@/types/questTable";

/** Shared catalog for Quest admin UI and dashboard insights (mock). */
export const MOCK_QUESTS: QuestDetails[] = [
  {
    id: "699dbee2508fddade48e1710",
    startDate: "2/1/2026",
    endDate: "2/28/2026",
    status: "active",
    rewardStatus: "claimed",
    facebookPage: "Yes",
    facebookPost: "Yes",
    line: "Yes",
    bannerEn: "Yes",
    bannerTh: "Yes",
    subBannerEn: "Yes",
    subBannerTh: "Yes",
    facebookPageLink: "https://facebook.com/gogocash",
    facebookPostLink: "https://facebook.com/gogocash/posts/quest-feb-2026",
    lineLink: "https://line.me/R/ti/p/@gogocash",
    tasks: [
      {
        taskType: "offer",
        offerId: "o1",
        offerName: "Banana IT TH - CPS",
        points: 50,
        completionLimit: "multiple",
        condition: null,
        link: "https://www.bananastore.com/th",
      },
      {
        taskType: "offer",
        offerId: "o2",
        offerName: "Adidas TH - CPS",
        points: 75,
        completionLimit: "once",
        condition: { operator: ">=", metric: "sale", amount: 100, currency: "THB" },
        link: "https://www.adidas.co.th",
      },
      {
        taskType: "merchant",
        merchantId: "m1",
        merchantName: "Merchant A",
        points: 25,
        completionLimit: "multiple",
        condition: null,
        link: "https://merchant-a.example.com",
      },
    ],
  },
  {
    id: "699dbee2508fddade48e1711",
    startDate: "3/1/2026",
    endDate: "3/31/2026",
    status: "pending",
    rewardStatus: "pending",
    facebookPage: "No",
    facebookPost: "No",
    line: "No",
    bannerEn: "No",
    bannerTh: "No",
    subBannerEn: "No",
    subBannerTh: "No",
  },
];

/** Mock participant rows — first quest simulates a large leaderboard. */
export function mockQuestParticipantTotal(questId: string): number {
  return questId === MOCK_QUESTS[0]?.id ? 1500 : 20;
}
