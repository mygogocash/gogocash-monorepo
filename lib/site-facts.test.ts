import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FAQ_ITEMS } from "./faq-data";
import { loadBundledPartnerBrands } from "./partner-logo-resolve";
import { SITE_FACTS, heroSeoSupportingLine } from "./site-facts";

const BARE_BRAND_CLAIM = new RegExp(
  `${SITE_FACTS.partnerCountLabel.replace("+", "\\+")}\\s+brands\\b`,
  "i",
);

/**
 * Issue #5 — copy said "70+ brands" while the brand directory shows the live
 * count (123). "70+" is the *active cashback partner* claim; the directory is
 * the *browsable brand* list. Keep them as distinct, non-contradicting metrics:
 * the claim is framed as "partners", and the directory must be a superset of it.
 */
describe("site-facts brand claim consistency", () => {
  it("frames the 70+ figure as partners, not a bare brand count", () => {
    const line = heroSeoSupportingLine();
    assert.ok(
      line.includes(SITE_FACTS.partnerCountLabel),
      `expected the partner-count label in: ${line}`,
    );
    assert.ok(
      /partner/i.test(line),
      `claim should use partner framing: ${line}`,
    );
    assert.ok(
      !new RegExp(`${SITE_FACTS.partnerCountLabel.replace("+", "\\+")}\\s+brands\\b`, "i").test(line),
      `claim must not read as a bare brand count that collides with the directory: ${line}`,
    );
  });

  it("browsable brand directory is a superset of the active-partner claim", () => {
    const directoryCount = loadBundledPartnerBrands().length;
    assert.ok(
      directoryCount >= SITE_FACTS.partnerCountMin,
      `directory has ${directoryCount} brands but claims ${SITE_FACTS.partnerCountMin}+ partners`,
    );
  });

  it("FAQ copy never states the partner count as a bare brand count", () => {
    for (const item of FAQ_ITEMS) {
      const text = `${item.question} ${item.answer}`;
      assert.ok(
        !BARE_BRAND_CLAIM.test(text),
        `FAQ collides with the brand directory ("${SITE_FACTS.partnerCountLabel} brands"): ${item.question}`,
      );
    }
  });
});
