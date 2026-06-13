import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LearnArticleSchema from "@/components/learn-article-schema";
import LegalDocumentShell from "@/components/legal/legal-document-shell";
import { LegalMarkdown } from "@/components/legal/legal-markdown";
import {
  getLearnArticlePageData,
  getLearnArticles,
} from "@/lib/learn-data";
import { learnArticleDateIso } from "@/lib/learn-article-dates";
import {
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
} from "@/lib/social-preview";

/** Default marketing OG asset (matches root `layout.tsx`). */
const DEFAULT_OG_IMAGE = OG_IMAGE_PATH;

export const dynamic = "force-static";

export async function generateStaticParams() {
  const articles = await getLearnArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLearnArticlePageData(slug);
  if (!data) return {};
  const { meta } = data;
  const iso = learnArticleDateIso(meta.updated);
  return {
    title: meta.metaTitle,
    description: meta.metaDescription,
    alternates: { canonical: `/learn/${slug}` },
    openGraph: {
      type: "article",
      title: meta.metaTitle,
      description: meta.metaDescription,
      url: `/learn/${slug}`,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: OG_IMAGE_ALT,
        },
      ],
      ...(iso
        ? { modifiedTime: iso, publishedTime: iso }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.metaTitle,
      description: meta.metaDescription,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function LearnArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getLearnArticlePageData(slug);
  if (!data) notFound();

  const { meta, markdown } = data;

  return (
    <>
      <LearnArticleSchema slug={slug} meta={meta} />
      <LegalDocumentShell
        title={meta.title}
        effectiveDate={meta.updated}
        dateLabel="Last updated"
      >
        <p className="mb-8 text-sm text-gray-600">
          <Link href="/learn" className="font-medium text-primary hover:underline">
            ← All Learn articles
          </Link>
        </p>
        <LegalMarkdown content={markdown} />
      </LegalDocumentShell>
    </>
  );
}
