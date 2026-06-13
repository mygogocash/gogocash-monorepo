import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalDocumentShell from "@/components/legal/legal-document-shell";
import { LegalMarkdown } from "@/components/legal/legal-markdown";

export const metadata: Metadata = {
  title: "How GoGoCash Makes Money | GoGoCash",
  description:
    "GoGoCash earns partner commissions on qualifying purchases; cashback comes from those partnerships. No subscription fees for shoppers.",
  alternates: { canonical: "/how-gogocash-makes-money" },
};

export default function HowGoGoCashMakesMoneyPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "content/legal/how-gogocash-makes-money.md"),
    "utf8",
  );

  return (
    <LegalDocumentShell
      title="How GoGoCash Makes Money"
      effectiveDate="March 22, 2026"
      dateLabel="Last updated"
    >
      <LegalMarkdown content={content} />
    </LegalDocumentShell>
  );
}
