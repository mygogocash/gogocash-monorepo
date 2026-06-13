import type { MetadataRoute } from "next";
import { learnArticlePathsAsync } from "@/lib/learn-data";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();
  const lastModified = new Date("2026-03-22");

  const learnPaths = await learnArticlePathsAsync();

  const routes = [
    "",
    "/privacy-policy",
    "/term-of-use",
    "/terms-of-service",
    "/how-gogocash-makes-money",
    "/search",
    "/about",
    "/id",
    "/th",
    "/tw",
    "/cn",
    "/ja",
    "/learn",
    ...learnPaths,
  ];

  return routes.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/learn") ? 0.8 : 0.6,
  }));
}
