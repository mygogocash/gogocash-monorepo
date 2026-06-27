import { describe, expect, it } from "vitest";

import {
  resolveCustomerAccountResourceSessionScope,
} from "../account/customerAccountResourceQueryKey";

describe("resolveCustomerAccountResourceSessionScope", () => {
  it("wallet > given a signed-in user id > then scopes cache entries to that identity", () => {
    expect(
      resolveCustomerAccountResourceSessionScope("wallet", {
        _id: "user-123",
        access_token: "jwt",
      }),
    ).toBe("user-123");
  });

  it("wallet > given only an access token > then falls back to a token scope", () => {
    expect(
      resolveCustomerAccountResourceSessionScope("wallet", {
        access_token: "demo-session",
      }),
    ).toBe("token:demo-session");
  });

  it("topBrand > given any session > then stays on the shared public scope", () => {
    expect(
      resolveCustomerAccountResourceSessionScope("topBrand", {
        _id: "user-123",
        access_token: "jwt",
      }),
    ).toBe("public");
  });
});
