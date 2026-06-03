import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFaqPageSchema } from "./faq-schema";

/**
 * Issue #18 — per-locale FAQPage JSON-LD. The builder must turn Q&A pairs into a
 * schema.org FAQPage so each locale route can emit its own localized schema.
 */
describe("buildFaqPageSchema", () => {
  const items = [
    { question: "Q one?", answer: "A one." },
    { question: "Q two?", answer: "A two." },
  ];

  it("produces a schema.org FAQPage", () => {
    const schema = buildFaqPageSchema(items);
    assert.equal(schema["@context"], "https://schema.org");
    assert.equal(schema["@type"], "FAQPage");
  });

  it("maps every Q&A pair to a Question with an accepted Answer", () => {
    const schema = buildFaqPageSchema(items);
    assert.equal(schema.mainEntity.length, 2);
    const [first] = schema.mainEntity;
    assert.equal(first["@type"], "Question");
    assert.equal(first.name, "Q one?");
    assert.equal(first.acceptedAnswer["@type"], "Answer");
    assert.equal(first.acceptedAnswer.text, "A one.");
  });

  it("preserves localized text verbatim (no English assumption)", () => {
    const schema = buildFaqPageSchema([
      { question: "คำถามภาษาไทย?", answer: "คำตอบภาษาไทย" },
    ]);
    assert.equal(schema.mainEntity[0].name, "คำถามภาษาไทย?");
    assert.equal(schema.mainEntity[0].acceptedAnswer.text, "คำตอบภาษาไทย");
  });

  it("handles an empty list", () => {
    assert.deepEqual(buildFaqPageSchema([]).mainEntity, []);
  });
});
