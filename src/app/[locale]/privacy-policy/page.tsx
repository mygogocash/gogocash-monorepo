import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";

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

  return (
    <div className="gc-page-block mx-auto w-full max-w-[800px] px-4 py-10 md:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">{t("privacyPolicyPageTitle")}</h1>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#3b3b3b]">
        {content}
      </pre>
    </div>
  );
}
