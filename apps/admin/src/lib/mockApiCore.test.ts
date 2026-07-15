import { beforeEach, describe, it, expect } from "vitest";
import { handleMockApiRequest, type MockApiResult } from "@/lib/mockApiCore";
import { __resetRolesForTest } from "@/lib/rbac/roleStore";

beforeEach(() => __resetRolesForTest());

const call = (
  method: string,
  path: string[],
  opts: { query?: Record<string, string>; body?: unknown; role?: string } = {},
): Promise<MockApiResult> =>
  handleMockApiRequest({
    method,
    path,
    searchParams: new URLSearchParams(opts.query ?? {}),
    body: opts.body,
    role: opts.role ?? "super_admin",
  });

describe("pagination clamping", () => {
  it("clamps page<1 and non-numeric limit to sane values", async () => {
    const res = await call("GET", ["admin"], {
      query: { page: "0", limit: "abc" },
    });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: unknown[];
      pagination: { page: number; limit: number; totalPages: number };
    };
    expect(body.pagination.page).toBeGreaterThanOrEqual(1);
    expect(body.pagination.limit).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(body.pagination.totalPages)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});

describe("policy category create (mock parity with POST /admin/create-category)", () => {
  it("creates a category from the fetcherPost tuple body shape", async () => {
    const res = await call("POST", ["admin", "create-category"], {
      body: { data: { name: "  New category  " } },
    });
    expect(res.status).toBe(200);
    const body = res.body as { _id: string; name: string };
    expect(body._id).toBeTruthy();
    expect(body.name).toBe("New category");
  });

  it("rejects a missing name with 400", async () => {
    const res = await call("POST", ["admin", "create-category"], {
      body: { data: {} },
    });
    expect(res.status).toBe(400);
    expect((res.body as { message: string }).message).toBe("name is required");
  });
});

describe("banner slot updates", () => {
  it("persists only edited slot fields while preserving other slots", async () => {
    const baseline = await call("GET", ["admin", "banner-home"]);
    expect(baseline.status).toBe(200);
    const before = baseline.body as Record<string, unknown>;

    const update = await call("POST", ["admin", "banner-home"], {
      body: {
        link_1: "https://slot-1-updated.example",
        image_1: "slot-1-updated",
        enabled_1: false,
        start_date_1: "2026-07-01",
        end_date_1: "2026-07-31",
      },
    });
    expect(update.status).toBe(200);

    const updated = (await call("GET", ["admin", "banner-home"])).body as Record<
      string,
      unknown
    >;
    expect(updated.link_1).toBe("https://slot-1-updated.example");
    expect(updated.image_1).toBe("slot-1-updated");
    expect(updated.enabled_1).toBe(false);
    expect(updated.start_date_1).toBe("2026-07-01");
    expect(updated.end_date_1).toBe("2026-07-31");
    expect(updated.link_2).toBe(before.link_2);
    expect(updated.image_2).toBe(before.image_2);
    expect(updated.enabled_2).toBe(before.enabled_2);

    await call("POST", ["admin", "banner-home"], {
      body: {
        link_1: String(before.link_1 || ""),
        image_1:
          before.image_1 == null ? "" : String(before.image_1),
        enabled_1: before.enabled_1,
        start_date_1: String(before.start_date_1 || ""),
        end_date_1: String(before.end_date_1 || ""),
      },
    });
  });

  it("clears a slot image when clear_image flag is sent", async () => {
    await call("POST", ["admin", "banner-home"], {
      body: {
        link_2: "",
        enabled_2: false,
        start_date_2: "",
        end_date_2: "",
        clear_image_2: true,
      },
    });

    const updated = (await call("GET", ["admin", "banner-home"])).body as Record<
      string,
      unknown
    >;
    expect(updated.image_2).toBeNull();
    expect(updated.link_2).toBe("");
    expect(updated.enabled_2).toBe(false);
  });

  it("persists uploaded File blobs from FormData bodies", async () => {
    const formData = new FormData();
    formData.append("link_3", "https://slot-3-file.example");
    formData.append("enabled_3", "true");
    formData.append("start_date_3", "");
    formData.append("end_date_3", "");
    formData.append(
      "image_3",
      new File(["banner-bytes"], "slot-3.png", { type: "image/png" }),
    );

    const update = await call("POST", ["admin", "banner-home"], {
      body: formData,
    });
    expect(update.status).toBe(200);

    const updated = (await call("GET", ["admin", "banner-home"])).body as Record<
      string,
      unknown
    >;
    expect(updated.link_3).toBe("https://slot-3-file.example");
    expect(String(updated.image_3)).toMatch(/^mock-drive-image_3-/);
  });
});

describe("top-brands config", () => {
  it("round-trips ordered identities and derives cashback from live offers", async () => {
    const brands = [
      { offerId: "o2", cashback: "12%" },
      { offerId: "o1", cashback: "8%" },
    ];

    const put = await call("PUT", ["admin", "top-brands"], {
      body: { brands },
    });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({
      success: true,
      brands: brands.map(({ offerId }) => ({ offerId, cashback: "" })),
    });

    const get = await call("GET", ["admin", "top-brands"]);
    expect(get.status).toBe(200);
    const body = get.body as {
      brands: typeof brands;
      items: Array<{ _id: string }>;
      maxBrands: number;
      order: string[];
    };
    expect(body.order).toEqual(["o2", "o1"]);
    expect(body.brands).toEqual([
      { offerId: "o2", cashback: "4%" },
      { offerId: "o1", cashback: "5%" },
    ]);
    expect(body.items.map((item) => item._id)).toEqual(["o2", "o1"]);
    expect(body.maxBrands).toBe(16);
  });
});

describe("offer admin search", () => {
  it("findAll > given search Shopee > then returns Shopee mock offers", async () => {
    const res = await call("GET", ["offer", "admin"], {
      query: { search: "Shopee", limit: "10", page: "1" },
    });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: Array<{ offer_name_display?: string; offer_name: string }>;
      total: number;
    };
    expect(body.total).toBeGreaterThan(0);
    expect(
      body.data.some(
        (offer) =>
          offer.offer_name_display === "Shopee" ||
          offer.offer_name.toLowerCase().includes("shopee"),
      ),
    ).toBe(true);
  });
});

describe("quest task management", () => {
  it("round-trips task saves and mirrors extra_point to mock offers", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    expect(list.status).toBe(200);
    const quest = (list.body as Array<{ _id: string }>)[0];

    const save = await call(
      "PATCH",
      ["point", "admin-quest", quest._id, "tasks"],
      {
        body: {
          tasks: [
            {
              offer: "o1",
              offer_id: 1001,
              merchant_id: 5001,
              extra_point: 80,
              enabled: true,
            },
          ],
        },
      },
    );

    expect(save.status).toBe(200);
    const updated = save.body as {
      tasks: Array<{ extra_point: number; sort_order: number }>;
    };
    expect(updated.tasks).toMatchObject([{ extra_point: 80, sort_order: 0 }]);

    const offer = await call("GET", ["offer", "o1"]);
    expect((offer.body as { extra_point?: number }).extra_point).toBe(80);
  });

  it("rejects duplicate task offers", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as Array<{ _id: string }>)[0];

    const save = await call(
      "PATCH",
      ["point", "admin-quest", quest._id, "tasks"],
      {
        body: {
          tasks: [
            { offer: "o1", offer_id: 1001, merchant_id: 5001, extra_point: 50 },
            { offer: "o1", offer_id: 1001, merchant_id: 5001, extra_point: 60 },
          ],
        },
      },
    );

    expect(save.status).toBe(400);
  });

  it("round-trips reward saves with automatic distribution settings", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as Array<{ _id: string }>)[0];

    const save = await call(
      "PATCH",
      ["point", "admin-quest", quest._id, "rewards"],
      {
        body: {
          reward_distribution_mode: "after_days",
          reward_distribution_delay_days: 7,
          rewards: [
            { rank: 1, reward: 1200, currency: "THB" },
            { rank: 2, reward: 800, currency: "THB" },
          ],
        },
      },
    );

    expect(save.status).toBe(200);
    expect(save.body).toMatchObject({
      reward_distribution_mode: "after_days",
      reward_distribution_delay_days: 7,
      reward_distribution_scheduled_at: "2026-07-07T00:00:00.000Z",
      rewards: [
        { rank: 1, reward: 1200, currency: "THB" },
        { rank: 2, reward: 800, currency: "THB" },
      ],
    });
  });

  it("returns a quest leaderboard response for the admin Quest page", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as Array<{ _id: string }>)[0];

    const res = await call("GET", [
      "point",
      "admin-quest",
      quest._id,
      "leaderboard",
    ]);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      data_source: "quest_range",
      quest: { _id: quest._id },
      rewards: expect.arrayContaining([
        { rank: 1, reward: 1200, currency: "THB" },
      ]),
    });
    expect((res.body as { data: unknown[] }).data.length).toBeGreaterThan(0);
  });
});

describe("mock credit score detail", () => {
  it("returns null with 200 for unknown users so detail pages avoid browser 404 noise", async () => {
    const res = await call("GET", [
      "admin",
      "credit-scores",
      "000000000000000000009101",
    ]);

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

describe("PUT offer/user persistence", () => {
  it("returns 404 for an unknown offer id", async () => {
    const res = await call("PUT", ["offer", "does-not-exist"], {
      body: { offer_name_display: "X" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown user id", async () => {
    const res = await call("PUT", ["user", "does-not-exist"], {
      body: { gender: "x" },
    });
    expect(res.status).toBe(404);
  });

  it("persists a PUT to an existing offer", async () => {
    await call("PUT", ["offer", "o1"], {
      body: { offer_name_display: "Renamed" },
    });
    const res = await call("GET", ["offer", "o1"]);
    const body = res.body as { offer_name_display?: string };
    expect(body.offer_name_display).toBe("Renamed");
  });
});

describe("add-conversion id allocation", () => {
  it("assigns distinct, monotonic ids above the seeded range", async () => {
    const r1 = await call("POST", ["admin", "add-conversion"], {
      body: { aff_sub1: "u1" },
    });
    const r2 = await call("POST", ["admin", "add-conversion"], {
      body: { aff_sub1: "u1" },
    });
    const id1 = (r1.body as { conversion_id: number }).conversion_id;
    const id2 = (r2.body as { conversion_id: number }).conversion_id;
    expect(id1).toBeGreaterThan(600105);
    expect(id2).toBe(id1 + 1);
  });
});

describe("withdraw detail user", () => {
  it("exposes username on the detail user (read-only identity)", async () => {
    const res = await call("POST", ["withdraw", "list-check-admin", "u1"]);
    expect(res.status).toBe(200);
    const body = res.body as { user: { username?: string } };
    expect(body.user.username).toBe("alice_smith_1");
  });
});

describe("update-offer numeric guard", () => {
  it("ignores a non-numeric commission_store instead of storing NaN", async () => {
    await call("PATCH", ["admin", "update-offer", "o1"], {
      body: { commission_store: "7" },
    });
    await call("PATCH", ["admin", "update-offer", "o1"], {
      body: { commission_store: "null" },
    });
    const res = await call("GET", ["offer", "o1"]);
    const body = res.body as { commission_store?: unknown };
    expect(body.commission_store).toBe(7);
  });
});

describe("update-offer lookup slug", () => {
  it("persists an edited lookup_value (trimmed)", async () => {
    await call("PATCH", ["admin", "update-offer", "o1"], {
      body: { lookup_value: "  custom_slug_th  " },
    });
    const res = await call("GET", ["offer", "o1"]);
    const body = res.body as { lookup_value?: string };
    expect(body.lookup_value).toBe("custom_slug_th");
  });
});

describe("update-offer product types — pay-in", () => {
  it("persists pay_in, amount, and currency for a cash product line", async () => {
    await call("PATCH", ["admin", "update-offer", "o1"], {
      body: {
        product_types: JSON.stringify([
          { name: "Gift card", pay_in: "cash", amount: 50, currency: "USD" },
        ]),
      },
    });
    const res = await call("GET", ["offer", "o1"]);
    const body = res.body as {
      product_types?: Array<Record<string, unknown>>;
    };
    const row = body.product_types?.[0];
    expect(row?.pay_in).toBe("cash");
    expect(row?.amount).toBe(50);
    expect(row?.currency).toBe("USD");
  });

  it("defaults pay_in to 'cashback' when omitted", async () => {
    await call("PATCH", ["admin", "update-offer", "o1"], {
      body: {
        product_types: JSON.stringify([
          { name: "Electronics", commission_info: "7" },
        ]),
      },
    });
    const res = await call("GET", ["offer", "o1"]);
    const body = res.body as {
      product_types?: Array<Record<string, unknown>>;
    };
    expect(body.product_types?.[0]?.pay_in).toBe("cashback");
  });
});
