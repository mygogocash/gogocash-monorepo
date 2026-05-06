import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY_TEMPLATES,
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
});
