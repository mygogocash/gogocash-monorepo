import { afterEach, describe, expect, it } from "vitest";

import { isMockAdminPasswordAllowed } from "./mockAuthPolicy";

describe("isMockAdminPasswordAllowed", () => {
  afterEach(() => {
    delete process.env.ALLOW_MOCK_ADMIN_PASSWORD;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_FIREBASE_STATIC;
  });

  it("allows the static mock login when the API URL is whitespace-only", () => {
    process.env.NEXT_PUBLIC_API_URL = "   ";
    process.env.NEXT_PUBLIC_FIREBASE_STATIC = "1";

    expect(isMockAdminPasswordAllowed()).toBe(true);
  });
});
