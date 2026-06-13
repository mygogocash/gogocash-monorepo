import { beforeEach, describe, it, expect } from "vitest";
import { handleMockApiRequest } from "@/lib/mockApiCore";
import { createRole, __resetRolesForTest } from "@/lib/rbac/roleStore";

/**
 * Locks the server-side enforcement contract: the mock API must evaluate the
 * caller's permissions from the (possibly custom) role id it is given — never
 * coerce custom roles to a built-in tier. Regression guard for the
 * `roleFromRequest` coercion bug.
 */
beforeEach(() => __resetRolesForTest());

const req = (method: string, path: string[], role: string, body?: unknown) =>
  handleMockApiRequest({
    method,
    path,
    searchParams: new URLSearchParams(),
    body,
    role,
  });

describe("admin/role-management API enforcement", () => {
  it("allows a custom role that holds adminUsers:manage", async () => {
    createRole({
      label: "Co Admin",
      permissions: ["adminUsers:view", "adminUsers:manage"],
    });
    const res = await req("POST", ["admin", "roles"], "co_admin", {
      label: "Temp",
      permissions: [],
    });
    expect(res.status).not.toBe(403);
  });

  it("blocks a custom role that lacks adminUsers:manage", async () => {
    createRole({ label: "Analyst Plus", permissions: ["dashboard:view"] });
    const res = await req("DELETE", ["admin", "a2"], "analyst_plus");
    expect(res.status).toBe(403);
  });

  it("blocks the built-in viewer from admin writes", async () => {
    const res = await req("POST", ["admin", "invite"], "viewer", {
      email: "x@y.co",
    });
    expect(res.status).toBe(403);
  });

  it("lets super_admin read roles", async () => {
    const res = await req("GET", ["admin", "roles"], "super_admin");
    expect(res.status).toBe(200);
  });
});

describe("admin write-action enforcement (full permission matrix)", () => {
  it("blocks a viewer from adjusting a wallet balance (admin-feature route)", async () => {
    const res = await req(
      "POST",
      ["admin", "wallets", "w1", "adjust"],
      "viewer",
      { amount: 100 },
    );
    expect(res.status).toBe(403);
  });

  it("blocks a viewer from overriding a credit score", async () => {
    const res = await req(
      "PUT",
      ["admin", "credit-scores", "u1", "override"],
      "viewer",
      { newScore: 800 },
    );
    expect(res.status).toBe(403);
  });

  it("blocks a viewer from changing the withdrawal fee rate", async () => {
    const res = await req("PATCH", ["admin", "update-fee-rate"], "viewer", {
      system: 5,
    });
    expect(res.status).toBe(403);
  });

  it("blocks a viewer from adding a conversion (payout)", async () => {
    const res = await req("POST", ["admin", "add-conversion"], "viewer", {
      aff_sub1: "u1",
    });
    expect(res.status).toBe(403);
  });

  it("blocks a viewer from editing an offer's commission", async () => {
    const res = await req(
      "PATCH",
      ["admin", "update-offer", "1001"],
      "viewer",
      {
        commission_store: 9,
      },
    );
    expect(res.status).toBe(403);
  });

  it("blocks a viewer from deleting withdrawal user data", async () => {
    const res = await req("POST", ["withdraw", "delete-user-data"], "viewer", {
      userId: "u1",
    });
    expect(res.status).toBe(403);
  });

  it("blocks an editor from changing the fee rate (no fee:manage)", async () => {
    const res = await req("PATCH", ["admin", "update-fee-rate"], "editor", {
      system: 5,
    });
    expect(res.status).toBe(403);
  });

  it("allows an editor to add a conversion (has conversion:manage)", async () => {
    const res = await req("POST", ["admin", "add-conversion"], "editor", {
      aff_sub1: "u1",
    });
    expect(res.status).not.toBe(403);
  });

  it("allows an admin to change the fee rate (has fee:manage)", async () => {
    const res = await req("PATCH", ["admin", "update-fee-rate"], "admin", {
      system: 5,
    });
    expect(res.status).not.toBe(403);
  });

  it("allows a custom role with users:manage to adjust a wallet", async () => {
    createRole({ label: "Ops", permissions: ["users:view", "users:manage"] });
    const res = await req("POST", ["admin", "wallets", "w1", "adjust"], "ops", {
      amount: 100,
    });
    expect(res.status).not.toBe(403);
  });

  it("never gates reads — viewer can GET wallets", async () => {
    const res = await req("GET", ["admin", "wallets"], "viewer");
    expect(res.status).not.toBe(403);
  });

  it("never gates the login endpoint", async () => {
    const res = await req("POST", ["admin", "login"], "viewer", {
      email: "admin@gogocash.co",
      password: "1234",
    });
    expect(res.status).not.toBe(403);
  });

  it("treats list-mycashback-users POST as a read (not gated)", async () => {
    const res = await req(
      "POST",
      ["admin", "list-mycashback-users"],
      "viewer",
      { page: 1 },
    );
    expect(res.status).not.toBe(403);
  });

  it("returns 404 (not a fake 200) for an unimplemented DELETE", async () => {
    // super_admin clears the RBAC gate, so this isolates the handler behavior.
    const res = await req("DELETE", ["offer", "o999"], "super_admin");
    expect(res.status).toBe(404);
  });
});
