export type MockDeeplinkRow = {
  userId: string;
  email: string;
  offerName: string;
  /** Whether this deeplink targets an offer, shop, or brand surface */
  sourceType: "Offer" | "Shop" | "Brand";
  deeplink: string;
  createDate: string;
  updateDate: string;
  clicks: number;
};

const ROTATING_USERS: MockDeeplinkRow[] = Array.from({ length: 20 }, (_, i) => ({
  userId: ["68bf99fed9667685c1637607", "68bf99fed9667685c1637608", "68bf99fed9667685c1637609"][i % 3],
  email: ["jaibun.s89@gmail.com", "user2@example.com", "user3@example.com"][i % 3],
  offerName: ["Banana IT TH - CPS", "Adidas TH - CPS", "AirAsia Travel - CPS", "Banana IT TH Food - CPS"][i % 4],
  sourceType: (["Offer", "Shop", "Brand"] as const)[i % 3],
  deeplink: `https://invl.me/cln6cd${i}`,
  createDate: "1/18/2026 8:46:52",
  updateDate: "1/19/2026 10:30:00",
  clicks: 10 + i * 7 + (i % 5),
}));

/** Rows for mock withdraw detail user (`mockWithdrawDetail` — alice@example.com, user_id u1) */
const WITHDRAW_DETAIL_USER_DEEPLINKS: MockDeeplinkRow[] = [
  {
    userId: "u1",
    email: "alice@example.com",
    offerName: "Banana IT TH - CPS",
    sourceType: "Offer",
    deeplink: "https://gogocash.app/open/offer/banana-it-th?user=u1&src=withdraw-detail",
    createDate: "3/10/2026 9:12:00",
    updateDate: "3/14/2026 11:00:00",
    clicks: 42,
  },
  {
    userId: "u1",
    email: "alice@example.com",
    offerName: "Adidas TH - CPS",
    sourceType: "Shop",
    deeplink: "https://gogocash.app/shop/adidas-thailand?user=u1",
    createDate: "3/8/2026 14:22:00",
    updateDate: "3/12/2026 8:05:00",
    clicks: 18,
  },
  {
    userId: "u1",
    email: "alice@example.com",
    offerName: "AirAsia",
    sourceType: "Brand",
    deeplink: "https://gogocash.app/brand/airasia?user=u1",
    createDate: "3/5/2026 10:00:00",
    updateDate: "3/5/2026 10:00:00",
    clicks: 7,
  },
];

export const MOCK_DEEPLINKS: MockDeeplinkRow[] = [
  ...WITHDRAW_DETAIL_USER_DEEPLINKS,
  ...ROTATING_USERS,
];

export function filterDeeplinksForUser(
  rows: MockDeeplinkRow[],
  userId: string | undefined,
  userEmails: string[] | undefined,
): MockDeeplinkRow[] {
  const uid = (userId ?? "").trim();
  const emailSet = new Set(
    (userEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
  if (!uid && emailSet.size === 0) return [];
  return rows.filter((d) => {
    const idMatch = Boolean(uid && d.userId === uid);
    const emailMatch =
      emailSet.size > 0 && emailSet.has(d.email.toLowerCase());
    return idMatch || emailMatch;
  });
}
