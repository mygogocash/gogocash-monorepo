import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalDocumentShell from "@/components/legal/legal-document-shell";
import { LegalMarkdown } from "@/components/legal/legal-markdown";

export const metadata: Metadata = {
  title: "Terms of Use | GoGoCash",
  description:
    "GoGoCash Terms of Use — rules for using GoGoCash Platforms, accounts, and the Cashback Program.",
};

export default function TermsOfUsePage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "content/legal/term-of-use.md"),
    "utf8",
  );

  return (
    <LegalDocumentShell title="Terms of Use" effectiveDate="February 1, 2025">
      <LegalMarkdown content={content} />
    </LegalDocumentShell>
  );
}
