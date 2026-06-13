import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const routeMatrixPath = path.join(mobileRoot, "src/navigation/expoConversionMatrix.ts");
const publicDir = path.join(mobileRoot, "public");
const fallbackSiteUrl = "https://app-staging.gogocash.co";
const siteUrl = (process.env.EXPO_PUBLIC_FRONTEND_URL || fallbackSiteUrl).replace(/\/+$/, "");
const locales = ["en", "th"];

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getConcreteRoutes() {
  const source = fs.readFileSync(routeMatrixPath, "utf8");
  const routes = [...source.matchAll(/webPath:\s*"([^"]+)"[\s\S]*?owner:\s*"expo_customer"/g)]
    .map((match) => match[1])
    .filter((webPath) => !webPath.includes("["));

  return [...new Set(routes)];
}

function localizedRoute(locale, webPath) {
  return `${siteUrl}/${locale}${webPath === "/" ? "" : webPath}`;
}

const sitemapEntries = getConcreteRoutes()
  .flatMap((webPath) => locales.map((locale) => localizedRoute(locale, webPath)))
  .map((loc) => `  <url><loc>${xmlEscape(loc)}</loc></url>`)
  .join("\n");

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`
);
fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
);
