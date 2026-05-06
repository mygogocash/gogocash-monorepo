import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY_TEMPLATES,
  getTemplateBody,
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
