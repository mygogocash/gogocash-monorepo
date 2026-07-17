import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const sourceDir = dirname(fileURLToPath(import.meta.url));
const editSource = readFileSync(resolve(sourceDir, "FormOffer.tsx"), "utf8");
const createSource = readFileSync(
  resolve(sourceDir, "CreateBrandForm.tsx"),
  "utf8",
);

describe("offer policy authoring mode (#310, source signals)", () => {
  it.each([
    ["edit", editSource],
    ["create", createSource],
  ])("%s form renders the two explicit modes", (_name, source) => {
    expect(source).toContain("Provided Template");
    expect(source).toContain("Custom Writing");
    expect(source).toContain('aria-label="Policy authoring mode"');
  });

  it.each([
    ["edit", editSource],
    ["create", createSource],
  ])("%s form does not expose custom as a category option", (_name, source) => {
    expect(source).not.toContain('<option value="custom">');
  });

  it.each([
    ["edit", editSource],
    ["create", createSource],
  ])("%s form explains a missing configured template", (_name, source) => {
    expect(source).toContain("No T&amp;C configured for this category yet");
    expect(source).toContain("Policy Management, or switch to Custom Writing.");
  });

  it("create form derives untouched template text from the latest configuration", () => {
    expect(createSource).toMatch(
      /const effectiveTemplateTerms =\s*templateTermsTouched\s*\? templateTerms\s*: configuredTemplateTerms;/,
    );
    expect(createSource).toContain("value={effectiveTemplateTerms}");
    expect(createSource).toMatch(
      /policyMode === "custom" \? customTerms : effectiveTemplateTerms/,
    );
    expect(createSource).not.toMatch(
      /useEffect\(\(\) => \{[\s\S]{0,200}?setTemplateTerms\(configuredTemplateTerms\)/,
    );
  });

  it("edit form derives untouched template text and persists that exact value", () => {
    expect(editSource).toMatch(
      /const effectiveTemplateTerms =\s*policyMode === "template" &&[\s\S]{0,220}?\? configuredTemplateTerms\s*: \(form\.custom_terms \?\? ""\);/,
    );
    expect(editSource).toContain("value={effectiveTemplateTerms}");
    expect(editSource).toContain(
      'fd.append("custom_terms", policyTermsToSave);',
    );
    expect(editSource).not.toMatch(
      /useEffect\(\(\) => \{[\s\S]{0,500}?setTemplateTermsDraft\(configuredTemplateTerms\)/,
    );
  });
});
