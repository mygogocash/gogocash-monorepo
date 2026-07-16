import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY_TEMPLATES,
  NEW_POLICY_TERMS_REQUIRED_MESSAGE,
  asNonEmptyParsed,
  buildUnifiedPolicySavePlan,
  buildSavePayload,
  emptyParsedPolicy,
  getTemplateBody,
  type ParsedPolicy,
} from "./policyPayload";

/**
 * Phase 1 of the policy follow-ups (B — localised templates).
 *
 * Pin the contract for `getTemplateBody`: callers ask for a template's
 * body in a specific locale; the helper resolves it via a small fallback
 * chain (active locale → en → empty). Once consumers in PolicyTable
 * migrate to this helper (Phase 2), each locale tab can show the right
 * template body without admins doing manual translation.
 */

describe("getTemplateBody", () => {
  it("given template id with localised bodies > returns the matched locale", () => {
    // The "minimal" template has the shortest body — easy fixture.
    const en = getTemplateBody("minimal", "en");
    expect(en).toMatch(/Participation is subject/);
    expect(en).not.toBe("");
  });

  it("given locale missing from template > falls back to en", () => {
    // Until marketing supplies translations, every template has en at minimum.
    // Asking for a locale that isn't populated should return en, not empty.
    const ko = getTemplateBody("minimal", "ko");
    const en = getTemplateBody("minimal", "en");
    expect(ko).toBe(en);
  });

  it("given unknown template id > returns empty string", () => {
    expect(getTemplateBody("does-not-exist", "en")).toBe("");
  });

  it("given template with only en populated > returns en for any locale", () => {
    // Today (pre-translation), every template only has en. Verifies the
    // EN-only state is the documented launch baseline.
    for (const tmpl of DEFAULT_POLICY_TEMPLATES) {
      const en = getTemplateBody(tmpl.id, "en");
      const th = getTemplateBody(tmpl.id, "th");
      const ja = getTemplateBody(tmpl.id, "ja");
      expect(en).not.toBe("");
      // Until translations are added, all locales resolve to en.
      expect(th).toBe(en);
      expect(ja).toBe(en);
    }
  });
});

/**
 * Phase 3A.1 — extracted save-payload builder.
 *
 * The PolicyTable modal will need to send `banner` and `terms` independently
 * (an admin can edit just one). This helper centralises the wire shape so
 * the component doesn't have to construct it inline (which is also untested).
 *
 * Contract: only include keys that have content; empty banner / terms must
 * NOT clobber the other side's existing data on the server.
 */

const CATEGORY_ID = "507f1f77bcf86cd799439011";

function makeParsed(overrides: Partial<ParsedPolicy> = {}): ParsedPolicy {
  return {
    ...emptyParsedPolicy(),
    primary_locale: "th",
    translations: { th: "เนื้อหา" },
    ...overrides,
  };
}

describe("buildSavePayload", () => {
  it("given termsParsed only > emits payload with terms but no banner key", () => {
    const out = buildSavePayload({
      categoryId: CATEGORY_ID,
      termsParsed: makeParsed(),
    });
    expect(out.category_id).toBe(CATEGORY_ID);
    expect(out.terms).toBeDefined();
    expect(out.terms?.translations.th).toBe("เนื้อหา");
    expect(out).not.toHaveProperty("banner");
  });

  it("given bannerParsed only > emits payload with banner but no terms key", () => {
    const out = buildSavePayload({
      categoryId: CATEGORY_ID,
      bannerParsed: makeParsed({ translations: { th: "แบนเนอร์" } }),
    });
    expect(out.category_id).toBe(CATEGORY_ID);
    expect(out.banner).toBeDefined();
    expect(out.banner?.translations.th).toBe("แบนเนอร์");
    expect(out).not.toHaveProperty("terms");
  });

  it("given both banner and terms > emits both keys", () => {
    const out = buildSavePayload({
      categoryId: CATEGORY_ID,
      bannerParsed: makeParsed({ translations: { en: "Banner" } }),
      termsParsed: makeParsed({ translations: { en: "Terms" } }),
    });
    expect(out.banner?.translations.en).toBe("Banner");
    expect(out.terms?.translations.en).toBe("Terms");
  });

  it("given neither > emits payload with only category_id", () => {
    const out = buildSavePayload({ categoryId: CATEGORY_ID });
    expect(out).toEqual({ category_id: CATEGORY_ID });
  });

  it("given explicit clear flags > emits server-side unset intent", () => {
    const out = buildSavePayload({
      categoryId: CATEGORY_ID,
      clearTerms: true,
      clearBanner: true,
    });
    expect(out).toEqual({
      category_id: CATEGORY_ID,
      clear_terms: true,
      clear_banner: true,
    });
  });
});

describe("buildUnifiedPolicySavePlan", () => {
  it("rejects a first policy save without non-empty terms", () => {
    expect(
      buildUnifiedPolicySavePlan({
        categoryId: CATEGORY_ID,
        isNewPolicy: true,
        termsDirty: false,
        bannerDirty: true,
        bannerParsed: makeParsed({ translations: { en: "Banner" } }),
      }),
    ).toEqual({ ok: false, message: NEW_POLICY_TERMS_REQUIRED_MESSAGE });
  });

  it("creates a new policy with required terms and optional banner text together", () => {
    const plan = buildUnifiedPolicySavePlan({
      categoryId: CATEGORY_ID,
      isNewPolicy: true,
      termsDirty: true,
      bannerDirty: true,
      termsParsed: makeParsed({ translations: { en: "Terms" } }),
      bannerParsed: makeParsed({ translations: { en: "Banner" } }),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("expected a save plan");
    expect(plan.payload.terms?.translations.en).toBe("Terms");
    expect(plan.payload.banner?.translations.en).toBe("Banner");
  });

  it("keeps existing-policy partial updates scoped to dirty blocks", () => {
    const plan = buildUnifiedPolicySavePlan({
      categoryId: CATEGORY_ID,
      isNewPolicy: false,
      termsDirty: false,
      bannerDirty: true,
      termsParsed: makeParsed({ translations: { en: "Unchanged terms" } }),
      bannerParsed: makeParsed({ translations: { en: "Changed banner" } }),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("expected a save plan");
    expect(plan.payload.banner?.translations.en).toBe("Changed banner");
    expect(plan.payload).not.toHaveProperty("terms");
  });

  it("turns emptied existing blocks into explicit clear operations", () => {
    const plan = buildUnifiedPolicySavePlan({
      categoryId: CATEGORY_ID,
      isNewPolicy: false,
      termsDirty: true,
      bannerDirty: true,
    });
    expect(plan).toEqual({
      ok: true,
      payload: {
        category_id: CATEGORY_ID,
        clear_terms: true,
        clear_banner: true,
      },
    });
  });
});

/**
 * Phase 3A.2 — banner editor enablement.
 *
 * Backend's PUT /policy uses `$set` per provided block, so sending an
 * empty banner WOULD clobber existing banner content on the server.
 * `asNonEmptyParsed` is the gate that decides "is there any content
 * worth sending?" — pass undefined to buildSavePayload when not, and
 * the wire payload omits that block entirely.
 */
describe("asNonEmptyParsed", () => {
  it("given all-empty translations > returns undefined", () => {
    const result = asNonEmptyParsed({
      ...emptyParsedPolicy(),
      translations: { th: "", en: "   ", ja: "" },
    });
    expect(result).toBeUndefined();
  });

  it("given no translations key at all > returns undefined", () => {
    const result = asNonEmptyParsed({
      ...emptyParsedPolicy(),
      translations: {},
    });
    expect(result).toBeUndefined();
  });

  it("given at least one non-empty translation > returns the input unchanged", () => {
    const input: ParsedPolicy = {
      ...emptyParsedPolicy(),
      primary_locale: "th",
      translations: { th: "  ", en: "Hello" }, // en non-empty after trim
    };
    const result = asNonEmptyParsed(input);
    expect(result).toBe(input);
  });

  it("given a single space-padded value > treats it as empty", () => {
    const result = asNonEmptyParsed({
      ...emptyParsedPolicy(),
      translations: { th: "   \n  " },
    });
    expect(result).toBeUndefined();
  });
});
