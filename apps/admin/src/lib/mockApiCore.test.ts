import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetCouponArchivesForTest,
  handleMockApiRequest,
  type MockApiResult,
} from "@/lib/mockApiCore";
import { __resetRolesForTest } from "@/lib/rbac/roleStore";

beforeEach(() => {
  __resetRolesForTest();
  __resetCouponArchivesForTest();
});
afterEach(() => vi.unstubAllEnvs());

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

describe("coupon archive parity", () => {
  it("archives a coupon from admin history and the customer offer response", async () => {
    const before = await call("GET", ["offer", "get-coupon"], {
      query: { limit: "550", page: "1" },
    });
    const coupons = (
      before.body as {
        data: Array<{ _id: string; offer_id: { _id: string } }>;
      }
    ).data;
    const coupon = coupons.find((item) => item._id === "cp1");
    expect(coupon).toBeDefined();

    const deleted = await call("DELETE", ["offer", "coupons", "cp1"], {
      role: "admin",
    });
    expect(deleted).toMatchObject({
      status: 200,
      body: { archived: true, id: "cp1" },
    });

    const history = await call("GET", ["offer", "get-coupon"], {
      query: { limit: "550", page: "1" },
    });
    expect(
      (history.body as { data: Array<{ _id: string }> }).data,
    ).not.toContainEqual(expect.objectContaining({ _id: "cp1" }));

    const customerCoupons = await call("GET", [
      "offer",
      "get-coupon-id",
      coupon!.offer_id._id,
    ]);
    expect(customerCoupons.body).not.toContainEqual(
      expect.objectContaining({ _id: "cp1" }),
    );
  });

  it.each(["editor", "support", "viewer"])(
    "rejects coupon archive for the lower %s tier",
    async (role) => {
      const response = await call("DELETE", ["offer", "coupons", "cp1"], {
        role,
      });

      expect(response).toMatchObject({
        status: 403,
        body: {
          message: expect.stringContaining("admin"),
        },
      });
    },
  );
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

  it("persists a default category banner from a FormData draft", async () => {
    const create = await call("POST", ["admin", "create-category"], {
      body: { data: { name: "Policy banner category" } },
    });
    const categoryId = (create.body as { _id: string })._id;
    const formData = new FormData();
    formData.append(
      "banner",
      new File(["wide-banner"], "wide.png", { type: "image/png" }),
    );

    const update = await call(
      "PATCH",
      ["admin", "update-category", categoryId],
      { body: formData },
    );
    expect(update.status).toBe(200);

    const categories = (await call("GET", ["offer", "get-category", "list"]))
      .body as Array<{ _id: string; banner?: string }>;
    expect(
      categories.find((category) => category._id === categoryId)?.banner,
    ).toMatch(new RegExp(`^category-banner/${categoryId}/`));
  });
});

describe("policy unified save (mock parity with PUT /policy)", () => {
  it("requires terms on first save, accepts a flat DTO, and explicitly clears existing terms", async () => {
    const categoryId = "policy-unified-save-category";
    const bannerOnly = await call("PUT", ["policy"], {
      body: {
        category_id: categoryId,
        banner: { primary_locale: "en", translations: { en: "Banner" } },
      },
    });
    expect(bannerOnly.status).toBe(400);
    expect((bannerOnly.body as { message: string }).message).toBe(
      "Terms & conditions are required for a new policy.",
    );

    const create = await call("PUT", ["policy"], {
      body: {
        category_id: categoryId,
        terms: { primary_locale: "en", translations: { en: "Terms" } },
        banner: { primary_locale: "en", translations: { en: "Banner" } },
      },
    });
    expect(create.status).toBe(200);

    const clear = await call("PUT", ["policy"], {
      body: { category_id: categoryId, clear_terms: true },
    });
    expect(clear.status).toBe(200);

    const list = (await call("GET", ["policy", "category-list"]))
      .body as Array<{
      category_id: string;
      terms?: unknown;
      banner?: unknown;
    }>;
    const saved = list.find((row) => row.category_id === categoryId);
    expect(saved).not.toHaveProperty("terms");
    expect(saved).toHaveProperty("banner");
  });
});

describe("policy aggregate save (mock parity with PUT /policy/aggregate)", () => {
  it("creates category metadata and policy together, then replays the same request key", async () => {
    const form = new FormData();
    form.set("request_key", "mock-policy-aggregate-1");
    form.set("category_name", "  Mock   Travel  ");
    form.set("icon_key", "travel");
    form.set(
      "policy",
      JSON.stringify({
        category_id: "__new__",
        terms: { primary_locale: "en", translations: { en: "Terms" } },
        banner: { primary_locale: "en", translations: { en: "Banner" } },
      }),
    );
    form.set(
      "default_banner",
      new File(["banner"], "travel.png", { type: "image/png" }),
    );

    const first = await call("PUT", ["policy", "aggregate"], { body: form });
    const replay = await call("PUT", ["policy", "aggregate"], { body: form });

    expect(first.status).toBe(200);
    expect(replay).toEqual(first);
    expect(first.body).toMatchObject({
      request_key: "mock-policy-aggregate-1",
      category: {
        name: "Mock Travel",
        icon_key: "travel",
        lifecycle_status: "active",
        banner: expect.stringContaining("category-banner/"),
      },
      policy: {
        terms: { translations: { en: "Terms" } },
        banner: { translations: { en: "Banner" } },
      },
    });
  });

  it("rejects request-key reuse with a different aggregate payload", async () => {
    const form = new FormData();
    form.set("request_key", "mock-policy-aggregate-1");
    form.set("category_name", "Different category");
    form.set("icon_key", "food");
    form.set("policy", JSON.stringify({ category_id: "__new__" }));

    const response = await call("PUT", ["policy", "aggregate"], {
      body: form,
    });
    expect(response.status).toBe(409);
  });
});

describe("banner slot updates", () => {
  it("isolates all three specific-page targets and keeps the legacy alias", async () => {
    const targets = ["all-brands", "all-shops", "product-discovery"] as const;
    const before = new Map<string, Record<string, unknown>>();

    for (const target of targets) {
      const response = await call("GET", [
        "admin",
        "banner-specific-page",
        target,
      ]);
      expect(response.status).toBe(200);
      expect(
        String((response.body as Record<string, unknown>).image_1),
      ).toMatch(/^\/images\/carousel\//);
      before.set(target, response.body as Record<string, unknown>);
    }

    await call("POST", ["admin", "banner-specific-page", "all-shops"], {
      body: { link_1: "https://all-shops-only.example" },
    });

    expect(
      (await call("GET", ["admin", "banner-specific-page", "all-shops"])).body,
    ).toMatchObject({ link_1: "https://all-shops-only.example" });
    expect(
      (await call("GET", ["admin", "banner-specific-page", "all-brands"])).body,
    ).toMatchObject({ link_1: before.get("all-brands")?.link_1 });
    expect(
      (
        await call("GET", [
          "admin",
          "banner-specific-page",
          "product-discovery",
        ])
      ).body,
    ).toMatchObject({ link_1: before.get("product-discovery")?.link_1 });

    const legacy = await call("GET", ["admin", "banner-all-brand-page"]);
    expect(legacy.body).toEqual(
      (await call("GET", ["admin", "banner-specific-page", "all-brands"])).body,
    );

    await call("POST", ["admin", "banner-specific-page", "all-shops"], {
      body: { link_1: String(before.get("all-shops")?.link_1 ?? "") },
    });
  });

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

    const updated = (await call("GET", ["admin", "banner-home"]))
      .body as Record<string, unknown>;
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
        image_1: before.image_1 == null ? "" : String(before.image_1),
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

    const updated = (await call("GET", ["admin", "banner-home"]))
      .body as Record<string, unknown>;
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

    const updated = (await call("GET", ["admin", "banner-home"]))
      .body as Record<string, unknown>;
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

  it("#479 rejects disabled offers on PUT /admin/top-brands", async () => {
    const { mockOffers } = await import("@/app/api/mock/data");
    const target = mockOffers.find((offer) => offer._id === "o1");
    expect(target).toBeTruthy();
    const previous = target!.disabled;
    target!.disabled = true;

    try {
      const put = await call("PUT", ["admin", "top-brands"], {
        body: { brands: [{ offerId: "o1", cashback: "" }] },
      });
      expect(put.status).toBe(400);
      expect(put.body).toMatchObject({
        message: expect.stringMatching(/Disabled or missing offers/i),
      });
    } finally {
      target!.disabled = previous;
    }
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

type MockQuestTaskState = {
  _id: string;
  config_revision?: number;
  reward_model?: "legacy_v1" | "task_v2";
  timezone?: "Asia/Bangkok";
  audience?: { kind: "all" } | { kind: "membership_tiers"; tier_ids: string[] };
  reward_caps?: {
    max_awards_per_user: number | null;
    max_referrals_per_user: number | null;
  };
  tasks: Array<Record<string, unknown>>;
};

function mockQuestTaskSaveBody(
  quest: MockQuestTaskState,
  tasks: Array<Record<string, unknown>>,
  rewardModel = quest.reward_model ?? "legacy_v1",
) {
  return {
    reward_model: rewardModel,
    expected_config_revision: Number(quest.config_revision ?? 0),
    timezone: quest.timezone ?? "Asia/Bangkok",
    audience: quest.audience ?? { kind: "all" },
    reward_caps: quest.reward_caps ?? {
      max_awards_per_user: null,
      max_referrals_per_user: null,
    },
    tasks,
  };
}

function withoutTaskKeys(tasks: Array<Record<string, unknown>>) {
  return tasks.map(({ task_key: _taskKey, ...task }) => task);
}

describe("quest task management", () => {
  it("returns the effective-task catalog and server mutation capabilities", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as Array<{ _id: string; tasks: unknown[] }>)[0];

    const response = await call("GET", [
      "point",
      "admin-quest",
      quest._id,
      "effective-tasks",
    ]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      contract_version: 1,
      quest_id: quest._id,
      catalog_source: "canonical",
      stored_task_count: quest.tasks.length,
      effective_task_count: quest.tasks.length,
      capabilities: {
        can_edit_campaign_economics: false,
        can_edit_task_economics: false,
        can_edit_rewards: false,
        can_edit_presentation: true,
        can_create_revision: false,
        freeze_reason: "QUEST_ALREADY_STARTED",
      },
      revision_workflow: {
        workflow_enabled: false,
        task_v2_enabled: false,
        publish_ready: false,
        can_create_revision: false,
        can_publish: false,
        blockers: expect.arrayContaining([
          "QUEST_REVISION_WORKFLOW_DISABLED",
          "QUEST_TASK_V2_UNAVAILABLE",
          "QUEST_REVISION_PUBLISH_NOT_READY",
          "QUEST_REVISION_NOT_DRAFT",
        ]),
      },
      tasks: expect.arrayContaining([
        expect.objectContaining({
          task_kind: "brand_purchase",
          source: "quest_task",
          target: { kind: "purchase", required_purchases: 1 },
        }),
      ]),
    });
  });

  it("keeps an all-disabled stored task set canonical instead of exposing legacy fallbacks", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as MockQuestTaskState[])[0];
    const originalTasks = quest.tasks.map((task) => ({
      ...task,
      offer:
        typeof task.offer === "string"
          ? task.offer
          : (task.offer as { _id: string })._id,
    }));

    try {
      const first = originalTasks[0];
      const save = await call(
        "PATCH",
        ["point", "admin-quest", quest._id, "tasks"],
        {
          body: mockQuestTaskSaveBody(quest, [{ ...first, enabled: false }]),
        },
      );
      expect(save.status).toBe(200);

      const response = await call("GET", [
        "point",
        "admin-quest",
        quest._id,
        "effective-tasks",
      ]);
      expect(response.body).toMatchObject({
        catalog_source: "canonical",
        stored_task_count: 1,
        effective_task_count: 0,
        tasks: [],
      });
    } finally {
      const currentList = await call("GET", ["point", "admin-get-quest"]);
      const current = (currentList.body as MockQuestTaskState[]).find(
        (item) => item._id === quest._id,
      )!;
      await call("PATCH", ["point", "admin-quest", quest._id, "tasks"], {
        body: mockQuestTaskSaveBody(
          current,
          withoutTaskKeys(originalTasks),
          quest.reward_model,
        ),
      });
    }
  });

  it("round-trips the current Admin DTO, rehydrates provider ids, and mirrors offer points", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    expect(list.status).toBe(200);
    const quest = (list.body as MockQuestTaskState[])[0];
    const originalTasks = quest.tasks.map((task) => ({
      ...task,
      offer:
        typeof task.offer === "string"
          ? task.offer
          : (task.offer as { _id: string })._id,
    }));

    try {
      const save = await call(
        "PATCH",
        ["point", "admin-quest", quest._id, "tasks"],
        {
          body: mockQuestTaskSaveBody(quest, [
            {
              task_type: "brand_purchase",
              offer: "o1",
              points: 80,
              enabled: true,
              wording: "Shop at offer one",
              wording_en: "Shop at offer one",
              wording_th: "",
              notes: "",
            },
          ]),
        },
      );

      expect(save.status).toBe(200);
      const updated = save.body as MockQuestTaskState;
      expect(updated.config_revision).toBe(
        Number(quest.config_revision ?? 0) + 1,
      );
      expect(updated.tasks).toMatchObject([
        {
          task_key: expect.stringMatching(/^task_/),
          task_type: "brand_purchase",
          points: 80,
          extra_point: 80,
          offer_id: 1001,
          merchant_id: 2001,
          sort_order: 0,
        },
      ]);

      const offer = await call("GET", ["offer", "o1"]);
      expect((offer.body as { extra_point?: number }).extra_point).toBe(80);
    } finally {
      const currentList = await call("GET", ["point", "admin-get-quest"]);
      const current = (currentList.body as MockQuestTaskState[]).find(
        (item) => item._id === quest._id,
      )!;
      await call("PATCH", ["point", "admin-quest", quest._id, "tasks"], {
        body: mockQuestTaskSaveBody(
          current,
          withoutTaskKeys(originalTasks),
          quest.reward_model,
        ),
      });
    }
  });

  it("preserves typed referral and spend tasks in effective-task responses", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as MockQuestTaskState[])[0];
    const originalTasks = quest.tasks.map((task) => ({
      ...task,
      offer:
        typeof task.offer === "string"
          ? task.offer
          : (task.offer as { _id: string })._id,
    }));

    try {
      const save = await call(
        "PATCH",
        ["point", "admin-quest", quest._id, "tasks"],
        {
          body: mockQuestTaskSaveBody(
            quest,
            [
              {
                task_type: "friend_referral",
                completion_rule: "first_earning_conversion",
                points: 60,
                enabled: true,
                wording_en: "Invite a friend",
                wording_th: "ชวนเพื่อน",
                notes: "",
              },
              {
                task_type: "spend_target",
                spend_scope: "any_shop_via_ggc",
                target_thb_minor: 150_000,
                points: 100,
                enabled: true,
                wording_en: "Spend THB 1,500",
                wording_th: "",
                notes: "",
              },
            ],
            "task_v2",
          ),
        },
      );
      expect(save.status).toBe(200);
      const saved = save.body as MockQuestTaskState;
      expect(saved.tasks).toEqual([
        expect.objectContaining({
          task_key: expect.stringMatching(/^task_/),
          task_type: "friend_referral",
          completion_rule: "first_earning_conversion",
          points: 60,
        }),
        expect.objectContaining({
          task_key: expect.stringMatching(/^task_/),
          task_type: "spend_target",
          spend_scope: "any_shop_via_ggc",
          target_thb_minor: 150_000,
          points: 100,
        }),
      ]);

      const effective = await call("GET", [
        "point",
        "admin-quest",
        quest._id,
        "effective-tasks",
      ]);
      expect(effective.body).toMatchObject({
        config_revision: Number(quest.config_revision ?? 0) + 1,
        tasks: [
          {
            task_key: saved.tasks[0].task_key,
            task_kind: "friend_referral",
            target: {
              kind: "referral",
              completion_rule: "first_earning_conversion",
            },
          },
          {
            task_key: saved.tasks[1].task_key,
            task_kind: "spend_target",
            target: {
              kind: "spend_thb_minor",
              spend_scope: "any_shop_via_ggc",
              target_thb_minor: 150_000,
            },
          },
        ],
      });
    } finally {
      const currentList = await call("GET", ["point", "admin-get-quest"]);
      const current = (currentList.body as MockQuestTaskState[]).find(
        (item) => item._id === quest._id,
      )!;
      await call("PATCH", ["point", "admin-quest", quest._id, "tasks"], {
        body: mockQuestTaskSaveBody(
          current,
          withoutTaskKeys(originalTasks),
          quest.reward_model,
        ),
      });
    }
  });

  it("rejects duplicate task offers", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as MockQuestTaskState[])[0];

    const save = await call(
      "PATCH",
      ["point", "admin-quest", quest._id, "tasks"],
      {
        body: mockQuestTaskSaveBody(quest, [
          {
            task_type: "brand_purchase",
            offer: "o1",
            points: 50,
            enabled: true,
            wording_en: "First",
          },
          {
            task_type: "brand_purchase",
            offer: "o1",
            points: 60,
            enabled: true,
            wording_en: "Second",
          },
        ]),
      },
    );

    expect(save.status).toBe(400);
  });

  it("rejects stale task config revisions", async () => {
    const list = await call("GET", ["point", "admin-get-quest"]);
    const quest = (list.body as MockQuestTaskState[])[0];
    const response = await call(
      "PATCH",
      ["point", "admin-quest", quest._id, "tasks"],
      {
        body: {
          ...mockQuestTaskSaveBody(quest, quest.tasks),
          expected_config_revision: Number(quest.config_revision ?? 0) + 1,
        },
      },
    );

    expect(response).toMatchObject({
      status: 409,
      body: { code: "QUEST_CONFIG_REVISION_CONFLICT" },
    });
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

  it("creates an idempotent future revision draft and keeps mock publication default-off", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_QUEST_REVISION_WORKFLOW_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_QUEST_TASK_V2_ENABLED", "true");
    const list = await call("GET", ["point", "admin-get-quest"]);
    const source = (
      list.body as Array<{
        _id: string;
        campaign_revision?: number;
        config_revision?: number;
      }>
    )[0];
    const body = {
      request_key: "quest-revision:mock-2031-08",
      expected_campaign_revision: Number(source.campaign_revision ?? 0),
      expected_config_revision: Number(source.config_revision ?? 0),
      start_date: "2031-08-01T02:00:00.000Z",
      end_date: "2031-08-31T16:59:00.000Z",
      reason: "Prepare the next mock campaign.",
    };

    const created = await call(
      "POST",
      ["point", "admin-quest", source._id, "revisions"],
      { body },
    );
    const replay = await call(
      "POST",
      ["point", "admin-quest", source._id, "revisions"],
      { body },
    );

    expect(created.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(created.body).toMatchObject({
      quest: {
        publication_status: "draft",
        revision_of: source._id,
        reward_model: "task_v2",
      },
      revision_workflow: {
        workflow_enabled: true,
        publish_ready: false,
        can_publish: false,
      },
    });
    expect((replay.body as { quest: { _id: string } }).quest._id).toBe(
      (created.body as { quest: { _id: string } }).quest._id,
    );
    const replacement = await call(
      "POST",
      ["point", "admin-quest", source._id, "revisions"],
      {
        body: {
          ...body,
          request_key: "quest-revision:mock-2031-08-replacement",
        },
      },
    );
    expect(
      (replacement.body as { quest: { revision_number: number } }).quest
        .revision_number,
    ).toBe(
      (created.body as { quest: { revision_number: number } }).quest
        .revision_number + 1,
    );

    const capabilities = await call("GET", [
      "point",
      "admin-quest-capabilities",
    ]);
    expect(capabilities.body).toEqual({
      revision_workflow_enabled: true,
      direct_create_enabled: false,
    });
    const directCreate = await call("POST", ["point", "create-quest"], {
      body: {
        start_date: "2031-09-01T02:00:00.000Z",
        end_date: "2031-09-30T16:59:00.000Z",
      },
    });
    expect(directCreate).toMatchObject({
      status: 409,
      body: { code: "QUEST_DIRECT_CREATE_DISABLED" },
    });

    const revision = (created.body as { quest: MockQuestTaskState }).quest;
    const revisionId = revision._id;
    const clearTasks = await call(
      "PATCH",
      ["point", "admin-quest", revisionId, "tasks"],
      { body: mockQuestTaskSaveBody(revision, [], "task_v2") },
    );
    expect(clearTasks.status).toBe(200);
    const effective = await call("GET", [
      "point",
      "admin-quest",
      revisionId,
      "effective-tasks",
    ]);
    expect(effective.body).toMatchObject({
      catalog_source: "none",
      stored_task_count: 0,
      effective_task_count: 0,
      tasks: [],
    });

    const publish = await call("POST", [
      "point",
      "admin-quest",
      revisionId,
      "publish",
    ]);
    expect(publish.status).toBe(503);
    expect(publish.body).toMatchObject({
      code: "QUEST_REVISION_PUBLISH_NOT_READY",
    });
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

  it("returns an unknown user's fallback and overlays later profile edits", async () => {
    const userId = "lint-spread-regression-user";
    const initial = await call("POST", [
      "withdraw",
      "list-check-admin",
      userId,
    ]);
    expect(initial.status).toBe(200);
    expect((initial.body as { user: { _id: string } }).user._id).toBe(userId);

    const update = await call("POST", ["withdraw", "update-withdraw-user"], {
      body: { userId, fullName: "  Spread Regression  " },
    });
    expect(update.status).toBe(200);

    const updated = await call("POST", [
      "withdraw",
      "list-check-admin",
      userId,
    ]);
    expect((updated.body as { user: { fullName: string } }).user.fullName).toBe(
      "Spread Regression",
    );
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
