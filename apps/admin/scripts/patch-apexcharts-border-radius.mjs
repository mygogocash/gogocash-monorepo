/**
 * ApexCharts exposes `borderRadiusWhenStacked: "all"`, but its published
 * runtime bundles still render middle stack segments square. Patch every
 * browser/server entry point after install so the configured behavior is
 * consistent. The transformation is intentionally version-sensitive and
 * fails the install when a future bundle shape is no longer recognized.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.join(__dirname, "..");
const repoRoot = path.resolve(adminRoot, "..", "..");
const apexRoot = [
  path.join(adminRoot, "node_modules", "apexcharts"),
  path.join(repoRoot, "node_modules", "apexcharts"),
].find((candidate) => fs.existsSync(candidate));

if (!apexRoot) {
  console.warn("[patch-apexcharts] apexcharts not installed, skip");
  process.exit(0);
}

const READABLE_MARKER =
  'const radiusWhenStackedAll = w.config.plotOptions.bar.borderRadiusWhenStacked === "all";';
const MINIFIED_MARKER =
  'B="all"===s.config.plotOptions.bar.borderRadiusWhenStacked,C=B?"both":"none"';

function replaceFunction(source, startNeedle, endNeedle, transform) {
  const start = source.indexOf(startNeedle);
  if (start < 0) return null;

  const end = source.indexOf(endNeedle, start);
  if (end < 0) return null;

  const functionEnd = end + endNeedle.length;
  const before = source.slice(0, start);
  const body = source.slice(start, functionEnd);
  const after = source.slice(functionEnd);
  return `${before}${transform(body)}${after}`;
}

function patchReadableBundle(relativePath) {
  const bundlePath = path.join(apexRoot, relativePath);
  if (!fs.existsSync(bundlePath)) return;

  const source = fs.readFileSync(bundlePath, "utf8");
  if (source.includes(READABLE_MARKER)) return;

  const patched = replaceFunction(
    source,
    "createBorderRadiusArr(series) {",
    "barBackground(",
    (body) => {
      let next = body.replace(
        "const w = this.w;",
        `const w = this.w;\n      ${READABLE_MARKER}\n      const midStackRadius = radiusWhenStackedAll ? "both" : "none";`,
      );
      next = next.replace(
        /output\[([^\]]+)\]\[([^\]]+)\] = "none";/g,
        "output[$1][$2] = midStackRadius;",
      );
      return next;
    },
  );

  if (
    !patched ||
    !patched.includes(READABLE_MARKER) ||
    !patched.includes("= midStackRadius;")
  ) {
    throw new Error(
      `[patch-apexcharts] ${relativePath}: unsupported readable bundle layout`,
    );
  }

  fs.writeFileSync(bundlePath, patched);
  console.log(`[patch-apexcharts] patched ${relativePath}`);
}

function patchMinifiedBundle(relativePath) {
  const bundlePath = path.join(apexRoot, relativePath);
  if (!fs.existsSync(bundlePath)) return;

  const source = fs.readFileSync(bundlePath, "utf8");
  if (source.includes(MINIFIED_MARKER)) return;

  const patched = replaceFunction(
    source,
    "createBorderRadiusArr(t){",
    "return r}",
    (body) => {
      let next = body.replace(
        "const s=this.w,i=",
        `const s=this.w,${MINIFIED_MARKER},i=`,
      );
      const initializationEnd = next.indexOf("if(i)return r;");
      if (initializationEnd < 0) return next;

      const prefix = next.slice(0, initializationEnd);
      const assignments = next
        .slice(initializationEnd)
        .replaceAll(':"none"', ":C");
      return `${prefix}${assignments}`;
    },
  );

  if (
    !patched ||
    !patched.includes(MINIFIED_MARKER) ||
    !patched.includes(":C")
  ) {
    throw new Error(
      `[patch-apexcharts] ${relativePath}: unsupported minified bundle layout`,
    );
  }

  fs.writeFileSync(bundlePath, patched);
  console.log(`[patch-apexcharts] patched ${relativePath}`);
}

patchMinifiedBundle(path.join("dist", "apexcharts.common.js"));
patchReadableBundle(path.join("dist", "apexcharts.esm.js"));
patchMinifiedBundle(path.join("dist", "apexcharts.min.js"));
patchReadableBundle(path.join("dist", "apexcharts.js"));
