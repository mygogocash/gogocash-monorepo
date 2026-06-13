import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalDocumentShell from "@/components/legal/legal-document-shell";
import { LegalMarkdown } from "@/components/legal/legal-markdown";

export const metadata: Metadata = {
  title: "Terms of Service | GoGoCash",
  description:
    "GoGoCash Terms of Service — rules for using GoGoCash platforms, accounts, and the cashback program.",
  alternates: { canonical: "/terms-of-service" },
};

/** Same legal text as Terms of Use; alternate URL for SEO and ads compliance. */
export default function TermsOfServicePage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "content/legal/term-of-use.md"),
    "utf8",
  );

  return (
    <LegalDocumentShell title="Terms of Service" effectiveDate="February 1, 2025">
      <LegalMarkdown content={content} />
    </LegalDocumentShell>
  );
}
