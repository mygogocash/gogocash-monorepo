import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function visit(node: ts.Node, cb: (node: ts.Node) => void) {
  cb(node);
  node.forEachChild((child) => visit(child, cb));
}

describe("ShopDetailTermsExclusions", () => {
  const source = readFileSync(new URL("./ShopDetailTermsExclusions.tsx", import.meta.url), "utf8");
  const file = ts.createSourceFile(
    "ShopDetailTermsExclusions.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  it("renders the GoGoCash terms of use item as an external link", () => {
    let hasLinkKind = false;
    let hasTermsHref = false;
    let hasAnchor = false;

    visit(file, (node) => {
      if (ts.isPropertyAssignment(node)) {
        const name = node.name.getText(file);
        const value = node.initializer.getText(file);

        if (name === "kind" && value === '"link"') {
          hasLinkKind = true;
        }

        if (name === "href" && value === '"https://gogocash.co/term-of-use"') {
          hasTermsHref = true;
        }
      }

      if (ts.isJsxOpeningElement(node) && node.tagName.getText(file) === "a") {
        const attrs = new Map(
          node.attributes.properties.flatMap((attr) =>
            ts.isJsxAttribute(attr)
              ? [[attr.name.getText(file), attr.initializer?.getText(file) ?? ""]]
              : []
          )
        );

        if (
          attrs.get("href") === "{desc.href}" &&
          attrs.get("target") === '"_blank"' &&
          attrs.get("rel") === '"noopener noreferrer"'
        ) {
          hasAnchor = true;
        }
      }
    });

    expect(source).toContain("GoGoCash terms of use");
    expect(hasLinkKind).toBe(true);
    expect(hasTermsHref).toBe(true);
    expect(hasAnchor).toBe(true);
  });

  it("uses brand CI color tokens on the terms link", () => {
    let anchorClassName = "";

    visit(file, (node) => {
      if (ts.isJsxOpeningElement(node) && node.tagName.getText(file) === "a") {
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.getText(file) === "className") {
            anchorClassName = attr.initializer?.getText(file) ?? "";
          }
        }
      }
    });

    expect(anchorClassName).toContain("text-(--gc-primary)");
    expect(anchorClassName).toContain("hover:text-(--gc-primary-strong)");
    expect(anchorClassName).toContain("focus-visible:outline-(--gc-primary)");
    expect(anchorClassName).not.toContain("#005d46");
    expect(anchorClassName).not.toContain("#007d5e");
  });

  it("uses design token vars instead of hardcoded hex for accordion and icon colors", () => {
    expect(source).toContain("var(--gc-border-mint)");
    expect(source).toContain("var(--gc-primary)");
    expect(source).toContain("var(--gc-text)");
    expect(source).not.toContain('"#b7e7db"');
    expect(source).not.toContain('"#00cc99"');
    expect(source).not.toContain('"#3b3b3b"');
  });
});
