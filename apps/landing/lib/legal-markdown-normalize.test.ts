import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeLegalMarkdown } from "./legal-markdown-normalize";

describe("legal-markdown-normalize", () => {
  it("wraps a standalone Email: line in a mailto link", () => {
    const input = "Contact us.\n\nEmail: support@gogocash.co\n\nThanks.";
    const out = normalizeLegalMarkdown(input);
    assert.ok(out.includes("Email: [support@gogocash.co](mailto:support@gogocash.co)"));
    assert.ok(!out.match(/^Email:\s*support@/m));
  });

  it("is case-insensitive on Email label and handles multiple blocks", () => {
    const input = "email: a@b.co\n\nEMAIL: x@y.co";
    const out = normalizeLegalMarkdown(input);
    assert.equal(
      (out.match(/mailto:/g) ?? []).length,
      2,
    );
  });

  it("does not alter inline email text mid-sentence", () => {
    const input = "Write to Email: not-a-line-because-more-text follows.";
    assert.equal(normalizeLegalMarkdown(input), input);
  });
});
