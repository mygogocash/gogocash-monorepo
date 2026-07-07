#!/usr/bin/env node
/**
 * Map hardcoded light-mode color literals in StyleSheet factories to theme tokens
 * so dark mode renders correctly. Conservative by design:
 *
 *  - Only rewrites `backgroundColor:`, `*borderColor:`, and `color:` style props.
 *  - Only rewrites a known allow-list of light neutrals / tints (unknown values,
 *    brand colors, shadows, SVG `fill="..."` attrs are left untouched).
 *  - Brand / web-parity tints that some source-parity tests pin as a literal are
 *    WRAPPED in `pickThemed(colors, "<lightLiteral>", <darkToken>)` so the literal
 *    stays present (tests pass) while the value adapts in dark mode.
 *
 * Usage:
 *   node scripts/themedify-colors.mjs            # dry-run (prints proposed edits)
 *   node scripts/themedify-colors.mjs --write    # apply
 *   node scripts/themedify-colors.mjs --write src/screens/Foo.tsx  # subset
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const explicit = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// token = plain replacement; PT = pickThemed(colors, "<lit>", <darkToken>) wrap (keeps literal).
const BG = {
  "colors.white": "colors.card",
  '"#FFFFFF"': "colors.card",
  '"#FFF"': "colors.card",
  '"#FEFEFE"': "colors.card",
  '"#FDFDFD"': "colors.card",
  '"#FCFCFC"': "colors.card",
  '"#FBFEFB"': "colors.card",
  '"#FAFEFC"': "colors.card",
  '"#F6F6F6"': "colors.background",
  '"#FAFAFA"': "colors.fieldMuted",
  '"#F9FAFB"': "colors.fieldMuted",
  '"#F8F8F8"': "colors.fieldMuted",
  '"#F7F7F7"': "colors.fieldMuted",
  '"#F5F5F5"': "colors.fieldMuted",
  '"#F2F2F2"': "colors.fieldMuted",
  '"#F0F0F0"': "colors.fieldMuted",
  '"#EFEFEF"': "colors.fieldMuted",
  '"#F3F4F6"': "colors.fieldMuted",
  '"#F1F1F1"': "colors.fieldMuted",
  // mint tints
  '"#F3FCF9"': "PT:colors.primarySoft",
  '"#E8FBF5"': "PT:colors.primarySoft",
  '"#E6FAF5"': "PT:colors.primarySoft",
  '"#F1FFFC"': "PT:colors.primarySoft",
  '"#E7F8EE"': "PT:colors.primarySoft",
  '"#F8FBF5"': "PT:colors.primarySoft",
  '"#F6FBF9"': "PT:colors.primarySoft",
  '"#ECFDF5"': "PT:colors.primarySoft",
  '"#E8F5EF"': "PT:colors.primarySoft",
  '"#EAF8F1"': "PT:colors.primarySoft",
  '"#E6F7ED"': "PT:colors.primarySoft",
  '"#F1FFF9"': "PT:colors.primarySoft",
  // warning tints
  '"#FFF7E6"': "PT:colors.warningSoft",
  '"#FFFAF5"': "PT:colors.warningSoft",
  '"#FFF8EC"': "PT:colors.warningSoft",
  // blue tints (NB: "#DCEBFF" is pinned verbatim by account-hub-parity → left as-is)
  '"#EBF3FA"': "PT:colors.card",
  '"#EAF3FB"': "PT:colors.card",
  '"#DCEEFF"': "PT:colors.card",
  '"#EEF4FF"': "PT:colors.card",
  '"#EAF4FF"': "PT:colors.card",
  '"#F8FBFF"': "PT:colors.card",
  '"#EFF6FF"': "PT:colors.card",
};

const BORDER = {
  "colors.white": "colors.border",
  '"#E4E4E4"': "colors.border",
  '"#EAEAEA"': "colors.border",
  '"#EEEEEE"': "colors.border",
  '"#EDEDED"': "colors.border",
  '"#E8E8E8"': "colors.border",
  '"#E0E0E0"': "colors.border",
  '"#F0F0F0"': "colors.border",
  '"#DDDDDD"': "colors.border",
  '"#D9D9D9"': "colors.border",
  '"#E5E7EB"': "colors.border",
  '"#D8E2D9"': "colors.border",
  '"#ECECEC"': "colors.border",
  '"#E6E6E6"': "colors.border",
  '"#DEDEDE"': "colors.border",
  '"#CECBCB"': "colors.border",
  '"#F0E6D6"': "colors.border",
  '"rgba(152,152,152,0.4)"': "colors.border",
  '"rgba(152, 152, 152, 0.4)"': "colors.border",
  // mint borders (NB: "#D8EDE4" is pinned verbatim by account-hub-parity → left as-is)
  '"#D1FAE5"': "PT:colors.border",
  '"#CFF3E6"': "PT:colors.border",
  '"#E8F5EF"': "PT:colors.border",
  '"#D8F8EF"': "PT:colors.border",
  '"#C7EBDD"': "PT:colors.border",
};

const TEXT = {
  '"#7F7F7F"': "colors.muted",
  '"#6B7280"': "colors.muted",
  '"#888888"': "colors.muted",
  '"#888"': "colors.muted",
  '"#999999"': "colors.muted",
  '"#999"': "colors.muted",
  '"#9CA3AF"': "colors.muted",
  '"#858585"': "colors.muted",
  '"#5A5A5A"': "colors.muted",
  '"#6E6E6E"': "colors.muted",
  '"#737373"': "colors.muted",
  '"#6B6B6B"': "colors.muted",
  '"#7A7A7A"': "colors.muted",
  '"#989898"': "colors.textSoft",
  '"#9E9E9E"': "colors.textSoft",
  '"#A9A9A9"': "colors.textSoft",
  '"#3B3B3B"': "colors.ink",
  '"#000000"': "colors.ink",
  '"#000"': "colors.ink",
  '"#111827"': "colors.ink",
  '"#1A1A1A"': "colors.ink",
  '"#222222"': "colors.ink",
  '"#222"': "colors.ink",
  '"#333333"': "colors.ink",
  '"#333"': "colors.ink",
  '"#1F2937"': "colors.ink",
  '"#101828"': "colors.ink",
  '"#0064D6"': "colors.link",
  '"#5D87FF"': "colors.link",
  // dark-green text that sits on mint pills (unreadable on dark) → accent
  '"#0F5132"': "PT:colors.accent",
  '"#103522"': "PT:colors.accent",
  '"#102217"': "PT:colors.accent",
  '"#0B3B2A"': "PT:colors.accent",
  '"#0A5C42"': "PT:colors.accent",
  '"#005A3C"': "PT:colors.accent",
  // dark headline that sits directly on a (now-darkened) marketing banner backdrop
  '"#14252B"': "PT:colors.ink",
};

function classify(prop) {
  if (prop === "backgroundColor") return BG;
  if (prop === "color") return TEXT;
  if (/Color$/.test(prop) && prop.toLowerCase().includes("border")) return BORDER;
  return null;
}

const LINE = /^(\s*)([A-Za-z][A-Za-z0-9]*):\s*(colors\.\w+|"(?:#[0-9A-Fa-f]{3,8}|rgba?\([^"]*\))")\s*,?\s*$/;

// Only rewrite lines INSIDE a `...(colors: ThemeColors) { ... }` style factory, so
// `colors` is guaranteed in scope (never touch inline JSX styles or module constants).
const FACTORY_START = /\(\s*colors\s*:\s*ThemeColors\b/;

function transform(content) {
  let usedPickThemed = content.includes("pickThemed(");
  let changes = 0;
  const lines = content.split("\n");
  let inFactory = false;
  let depth = 0;
  const next = lines.map((line) => {
    if (!inFactory) {
      if (FACTORY_START.test(line)) {
        inFactory = true;
        depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      }
      return line;
    }
    const m = line.match(LINE);
    let result = line;
    if (m) {
      const [, indent, prop, value] = m;
      const map = classify(prop);
      const target = map ? map[value] : undefined;
      if (target) {
        changes++;
        if (target.startsWith("PT:")) {
          usedPickThemed = true;
          result = `${indent}${prop}: pickThemed(colors, ${value}, ${target.slice(3)}),`;
        } else {
          result = `${indent}${prop}: ${target},`;
        }
      }
    }
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (depth <= 0) inFactory = false;
    return result;
  });

  let out = next.join("\n");

  if (usedPickThemed && !/\bpickThemed\b[^\n]*from "@mobile\/theme\/colorPalettes"/.test(out)) {
    if (/import\s+type\s+\{\s*ThemeColors\s*\}\s+from\s+"@mobile\/theme\/colorPalettes";/.test(out)) {
      out = out.replace(
        /import\s+type\s+\{\s*ThemeColors\s*\}\s+from\s+"@mobile\/theme\/colorPalettes";/,
        'import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";',
      );
    } else if (/import\s+\{([^}]*)\}\s+from\s+"@mobile\/theme\/colorPalettes";/.test(out)) {
      out = out.replace(
        /import\s+\{([^}]*)\}\s+from\s+"@mobile\/theme\/colorPalettes";/,
        (full, inner) =>
          inner.includes("pickThemed")
            ? full
            : `import { pickThemed,${inner}} from "@mobile/theme/colorPalettes";`,
      );
    } else {
      out = `import { pickThemed } from "@mobile/theme/colorPalettes";\n${out}`;
    }
  }

  return { out, changes };
}

function collectFiles() {
  if (explicit.length > 0) return explicit.map((p) => path.resolve(ROOT, p));
  const dirs = ["src/screens", "src/components", "src/security", "src/gototrack"];
  const files = [];
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (name.endsWith(".tsx")) files.push(path.join(abs, name));
    }
  }
  return files;
}

let total = 0;
for (const file of collectFiles()) {
  const content = fs.readFileSync(file, "utf8");
  const { out, changes } = transform(content);
  if (changes === 0 || out === content) continue;
  total += changes;
  console.log(`${changes.toString().padStart(3)}  ${path.relative(ROOT, file)}`);
  if (write) fs.writeFileSync(file, out);
}
console.log(`\n${write ? "Applied" : "Would apply"} ${total} replacements.`);
