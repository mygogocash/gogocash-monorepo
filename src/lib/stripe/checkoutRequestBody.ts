import { z } from "zod";

/** POST body for `/api/stripe/checkout` — kept in one module for route + tests. */
export const stripeCheckoutBodySchema = z.object({
  tier: z.enum(["starter", "plus", "pro"]),
  interval: z.enum(["month", "year"]),
  locale: z.enum(["en", "th"]).optional().default("en"),
});

export type StripeCheckoutBody = z.infer<typeof stripeCheckoutBodySchema>;

export function parseStripeCheckoutBody(json: unknown) {
  return stripeCheckoutBodySchema.safeParse(json);
}
