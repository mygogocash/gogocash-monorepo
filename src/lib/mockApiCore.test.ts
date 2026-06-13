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
