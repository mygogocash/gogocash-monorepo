import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderLegalMarkdown } from "./renderLegalMarkdown";

/**
 * Minimal CommonMark-ish renderer for our `legal/*.md` files. The privacy
 * policy is the only consumer today; it uses just H1-H3, `**bold**`, `---`
 * horizontal rules, `- ` bulleted lists, plain paragraphs, soft-breaks via
 * trailing two spaces, and bare URLs that should auto-link. No tables, no
 * code blocks, no inline `[label](url)` links, no numbered lists.
 *
 * Tests render the React tree to a static HTML string so we can assert on
 * structure without spinning up a DOM. The visual classes are an implementation
 * detail of the renderer and are NOT what we test for — we only care that the
 * right semantic tags come out for each markdown feature.
 */

function html(md: string): string {
  return renderToStaticMarkup(renderLegalMarkdown(md));
}

describe("renderLegalMarkdown", () => {
  it("given # heading > emits an <h1>", () => {
    expect(html("# Privacy Policy")).toContain("<h1");
    expect(html("# Privacy Policy")).toContain(">Privacy Policy</h1>");
  });

  it("given ## heading > emits an <h2>", () => {
    expect(html("## 1. Who We Are")).toContain("<h2");
    expect(html("## 1. Who We Are")).toContain(">1. Who We Are</h2>");
  });

  it("given ### heading > emits an <h3>", () => {
    expect(html("### 4.1 Data you provide directly")).toContain("<h3");
    expect(html("### 4.1 Data you provide directly")).toContain(
      ">4.1 Data you provide directly</h3>"
    );
  });

  it("given a `---` line on its own > emits an <hr>", () => {
    const out = html("Hello\n\n---\n\nWorld");
    // Allow attributes like className: <hr class="..."/>
    expect(out).toMatch(/<hr\b[^>]*>/);
  });

  it("given a contiguous block of `- ` lines > emits a single <ul> with one <li> per line", () => {
    const md = "- one\n- two\n- three";
    const out = html(md);
    expect(out).toContain("<ul");
    expect(out.match(/<li/g)?.length).toBe(3);
    expect(out).toContain(">one</li>");
    expect(out).toContain(">two</li>");
    expect(out).toContain(">three</li>");
  });

  it("given **bold** spans inside a paragraph > emits <strong>", () => {
    const out = html("**Effective Date:** 1 April 2026");
    expect(out).toContain("<strong>Effective Date:</strong>");
  });

  it("given plain text > wraps it in a <p>", () => {
    const out = html("This is a plain paragraph of text.");
    expect(out).toContain("<p");
    expect(out).toContain(">This is a plain paragraph of text.</p>");
  });

  it("given a bare URL > auto-links it with target=_blank and rel attrs", () => {
    const out = html("Visit https://gogocash.co for details.");
    expect(out).toMatch(/<a [^>]*href="https:\/\/gogocash\.co"/);
    expect(out).toMatch(/rel="[^"]*noopener[^"]*"/);
    expect(out).toMatch(/target="_blank"/);
  });

  it("given trailing two-space soft break inside a paragraph > emits <br>", () => {
    const out = html("**Controller:** GoGoCash  \n**Address:** Surin");
    expect(out).toMatch(/<br\s*\/?>/);
  });

  it("given headings followed by paragraphs and lists > preserves block order", () => {
    const md = ["## Section", "Intro line.", "", "- a", "- b"].join("\n");
    const out = html(md);
    const hIdx = out.indexOf("<h2");
    const pIdx = out.indexOf("<p");
    const ulIdx = out.indexOf("<ul");
    expect(hIdx).toBeGreaterThan(-1);
    expect(pIdx).toBeGreaterThan(hIdx);
    expect(ulIdx).toBeGreaterThan(pIdx);
  });

  it("given an empty string > renders nothing crash-prone (empty fragment is fine)", () => {
    expect(() => html("")).not.toThrow();
  });

  it("given inline markdown characters that shouldn't be interpreted (no closing **) > leaves text intact", () => {
    const out = html("This has ** stray asterisks but no pair.");
    expect(out).toContain("This has ** stray asterisks but no pair.");
  });
});
