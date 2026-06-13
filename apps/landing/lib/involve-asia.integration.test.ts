import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fetchPartnerBrands } from "./involve-asia";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("involve-asia fetchPartnerBrands", () => {
  it("returns bundled partners when API credentials are missing", async () => {
    delete process.env.INVOLVE_ASIA_API_KEY;
    delete process.env.INVOLVE_ASIA_API_SECRET;
    const partners = await fetchPartnerBrands();
    assert.ok(Array.isArray(partners));
    assert.ok(partners.length > 0);
    assert.ok(partners.every((p) => typeof p.id === "string" && p.name.length > 0));
  });
});
