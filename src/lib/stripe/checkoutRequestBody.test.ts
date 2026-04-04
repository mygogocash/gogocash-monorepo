import { describe, expect, it } from "vitest";
import { parseStripeCheckoutBody, stripeCheckoutBodySchema } from "./checkoutRequestBody";

describe("stripeCheckoutBodySchema", () => {
  it("accepts a valid starter year payload", () => {
    const r = stripeCheckoutBodySchema.safeParse({
      tier: "starter",
      interval: "year",
      locale: "th",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tier).toBe("starter");
      expect(r.data.interval).toBe("year");
      expect(r.data.locale).toBe("th");
    }
  });

  it("defaults locale to en", () => {
    const r = stripeCheckoutBodySchema.safeParse({ tier: "plus", interval: "month" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.locale).toBe("en");
  });

  it("rejects invalid tier", () => {
    const r = parseStripeCheckoutBody({ tier: "enterprise", interval: "month" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid interval", () => {
    const r = parseStripeCheckoutBody({ tier: "starter", interval: "weekly" });
    expect(r.success).toBe(false);
  });
});
