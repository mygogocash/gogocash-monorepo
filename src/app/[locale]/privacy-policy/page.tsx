import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { renderLegalMarkdown } from "@/lib/markdown/renderLegalMarkdown";

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const file =
    locale === "th"
      ? "privacy-policy-th.md"
      : locale === "en"
        ? "privacy-policy-en.md"
        : "privacy-policy-en.md";
  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "legal", file);
  let content: string;
  try {
    content = await readFile(fullPath, "utf8");
  } catch {
    content = "Privacy policy file is missing.";
  }

  /**
   * The source markdown still owns the H1 ("# Privacy Policy"), so we render the
   * file as-is. The `privacyPolicyPageTitle` translation that previously sat above
   * the body became a duplicate once headings were styled — drop the second header
   * and let the markdown's own H1 carry the page title.
   */
  return (
    <div className="gc-page-block mx-auto w-full max-w-[800px] px-4 py-10 md:px-6">
      <article aria-label={t("privacyPolicyPageTitle")}>
        {renderLegalMarkdown(content)}
      </article>
    </div>
  );
}
