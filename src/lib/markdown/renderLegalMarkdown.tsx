import { Fragment, type ReactNode } from "react";

/**
 * Tiny CommonMark subset renderer for our static legal pages.
 *
 * Handles only what `legal/privacy-policy-en.md` and `legal/privacy-policy-th.md`
 * actually use today:
 *   - `# `, `## `, `### ` headings
 *   - `---` horizontal rules (line-on-its-own)
 *   - `- ` bullet lists (consecutive lines collapse into one <ul>)
 *   - `**...**` bold spans
 *   - bare `https?://...` URLs (auto-linked, opens in new tab)
 *   - trailing two-space soft-break → <br>
 *   - everything else: paragraph text
 *
 * Deliberately ships no dependency. If we ever add italics, links of the form
 * `[label](url)`, tables, or code blocks to legal/, swap this for `react-markdown`
 * and remove this file. See `renderLegalMarkdown.test.tsx`.
 */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "hr" }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

const HR_LINE = "---";
const BULLET_PREFIX = "- ";

function matchHeading(line: string): { level: 1 | 2 | 3; text: string } | null {
  const m = line.match(/^(#{1,3})\s+(.+)$/);
  if (!m || m[1] === undefined || m[2] === undefined) return null;
  return { level: m[1].length as 1 | 2 | 3, text: m[2].trim() };
}

/** Group raw lines into typed blocks. Blank lines separate paragraphs and lists. */
function blockify(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Eat blank lines between blocks.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Horizontal rule on its own line.
    if (line.trim() === HR_LINE) {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }

    const heading = matchHeading(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading.level, text: heading.text });
      i += 1;
      continue;
    }

    if (line.startsWith(BULLET_PREFIX)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(BULLET_PREFIX)) {
        items.push((lines[i] ?? "").slice(BULLET_PREFIX.length));
        i += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    // Collect a paragraph: everything until a blank line, heading, hr, or list.
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (
        next.trim() === "" ||
        next.trim() === HR_LINE ||
        matchHeading(next) !== null ||
        next.startsWith(BULLET_PREFIX)
      ) {
        break;
      }
      paragraphLines.push(next);
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

/** Match `**bold**` or bare `https?://...` URLs. URL list deliberately greedy until whitespace. */
const INLINE_TOKEN_RE = /(\*\*[^*\n]+\*\*)|(https?:\/\/[^\s)]+)/g;

/** Inline pass: bold + URL auto-link. Returns React children. */
function renderInlineSegment(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let tokenIdx = 0;

  for (const match of text.matchAll(INLINE_TOKEN_RE)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      out.push(text.slice(lastIndex, matchIndex));
    }
    const [whole, bold, url] = match;
    if (bold) {
      out.push(
        <strong key={`${keyPrefix}-b-${tokenIdx}`}>{bold.slice(2, -2)}</strong>
      );
    } else if (url) {
      out.push(
        <a
          key={`${keyPrefix}-a-${tokenIdx}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00aa80] underline underline-offset-2 hover:text-[#008f6c]"
        >
          {url}
        </a>
      );
    } else {
      out.push(whole);
    }
    lastIndex = matchIndex + whole.length;
    tokenIdx += 1;
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }
  return out;
}

/**
 * Render the inline content of a single paragraph. Splits on hard line breaks
 * (`  \n`) into lines that get separated by <br>. Within each line, soft
 * line breaks (just `\n`) collapse into a single space — same as CommonMark.
 */
function renderParagraphInline(text: string, keyPrefix: string): ReactNode[] {
  const hardBreakLines = text.split(/  \n/);
  const out: ReactNode[] = [];
  hardBreakLines.forEach((segment, lineIdx) => {
    if (lineIdx > 0) {
      out.push(<br key={`${keyPrefix}-br-${lineIdx}`} />);
    }
    // Replace remaining soft newlines with spaces and strip stray trailing
    // single spaces so we don't double-space when inputs are messy.
    const flat = segment.replace(/\n/g, " ").replace(/[ \t]+/g, " ").trim();
    out.push(...renderInlineSegment(flat, `${keyPrefix}-l${lineIdx}`));
  });
  return out;
}

/** Stable Tailwind classes for legal docs — generous spacing, neutral typography. */
const headingClass: Record<1 | 2 | 3, string> = {
  1: "mb-4 mt-2 text-2xl font-semibold text-[#1a1a1a] md:text-3xl",
  2: "mb-3 mt-8 text-xl font-semibold text-[#1a1a1a] md:text-2xl",
  3: "mb-2 mt-5 text-base font-semibold text-[#1a1a1a] md:text-lg",
};

/** Render a Block to JSX. Caller supplies a stable key. */
function renderBlock(block: Block, key: string): ReactNode {
  switch (block.kind) {
    case "heading": {
      const children = renderInlineSegment(block.text, key);
      if (block.level === 1) {
        return (
          <h1 key={key} className={headingClass[1]}>
            {children}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2 key={key} className={headingClass[2]}>
            {children}
          </h2>
        );
      }
      return (
        <h3 key={key} className={headingClass[3]}>
          {children}
        </h3>
      );
    }
    case "hr":
      return <hr key={key} className="my-8 border-t border-[#e4e4e4]" />;
    case "list":
      return (
        <ul
          key={key}
          className="my-3 ml-6 list-disc space-y-1 text-sm leading-relaxed text-[#3b3b3b] md:text-base"
        >
          {block.items.map((item, idx) => (
            <li key={`${key}-i${idx}`}>{renderInlineSegment(item, `${key}-i${idx}`)}</li>
          ))}
        </ul>
      );
    case "paragraph":
      return (
        <p
          key={key}
          className="my-3 text-sm leading-relaxed text-[#3b3b3b] md:text-base"
        >
          {renderParagraphInline(block.text, key)}
        </p>
      );
  }
}

/**
 * Render a legal markdown string as a React fragment of styled blocks.
 *
 * The output is a Fragment so callers control the outer container (and
 * the fragment is friendly to renderToStaticMarkup in unit tests).
 */
export function renderLegalMarkdown(md: string): ReactNode {
  const blocks = blockify(md);
  return (
    <Fragment>
      {blocks.map((block, idx) => renderBlock(block, `b${idx}`))}
    </Fragment>
  );
}
