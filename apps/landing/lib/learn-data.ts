import fs from "node:fs";
import path from "node:path";
import { debuglog } from "node:util";

const logLearn = debuglog("learn-data");
import {
  LEARN_ARTICLES,
  learnArticleBySlug,
  type LearnArticleMeta,
} from "@/lib/learn-articles";
import {
  fetchStrapiLearnArticleBySlug,
  fetchStrapiLearnIndex,
} from "@/lib/strapi-learn";
import { learnArticleMarkdownBySlug } from "@/lib/learn-article-content";

export type LearnArticlePageData = {
  meta: LearnArticleMeta;
  markdown: string;
};

/**
 * Articles for hub, sitemap, and static params.
 * Uses Strapi when `STRAPI_URL` is set and the API returns data; otherwise local `LEARN_ARTICLES`.
 */
export async function getLearnArticles(): Promise<LearnArticleMeta[]> {
  if (process.env.STRAPI_URL) {
    try {
      const remote = await fetchStrapiLearnIndex();
      if (remote.length > 0) return remote;
      logLearn(
        "[learn-data] Strapi returned no learn-articles; falling back to local LEARN_ARTICLES.",
      );
    } catch (e) {
      logLearn("[learn-data] Strapi fetch failed; using local fallback. %O", e);
    }
  }
  return LEARN_ARTICLES;
}

function readLocalMarkdown(slug: string): string | null {
  const mdPath = path.join(
    process.cwd(),
    "content",
    "learn",
    `${slug}.md`,
  );
  try {
    return fs.readFileSync(mdPath, "utf8");
  } catch {
    return learnArticleMarkdownBySlug(slug);
  }
}

/**
 * Article for `/learn/[slug]` at build time (static export).
 */
export async function getLearnArticlePageData(
  slug: string,
): Promise<LearnArticlePageData | null> {
  if (process.env.STRAPI_URL) {
    try {
      const fromApi = await fetchStrapiLearnArticleBySlug(slug);
      if (fromApi) return fromApi;
    } catch (e) {
      logLearn(
        `[learn-data] Strapi fetch failed for slug "%s"; trying local file. %O`,
        slug,
        e,
      );
    }
  }

  const meta = learnArticleBySlug(slug);
  if (!meta) return null;
  const markdown = readLocalMarkdown(slug);
  if (!markdown) return null;
  return { meta, markdown };
}

export async function learnArticlePathsAsync(): Promise<string[]> {
  const articles = await getLearnArticles();
  return articles.map((a) => `/learn/${a.slug}`);
}
