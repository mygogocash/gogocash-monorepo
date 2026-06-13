import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import LegalDocumentShell from "@/components/legal/legal-document-shell";
import { LegalMarkdown } from "@/components/legal/legal-markdown";

export const metadata: Metadata = {
  title: "Privacy Policy | GoGoCash",
  description:
    "How GOGO HOLDING (THAILAND) Company Limited (GoGoCash) collects, uses, and protects your personal data when you use our Services.",
};

export default function PrivacyPolicyPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "content/legal/privacy-policy.md"),
    "utf8",
  );

  return (
    <LegalDocumentShell title="Privacy Policy" effectiveDate="1 April 2026">
      <LegalMarkdown content={content} />
    </LegalDocumentShell>
  );
}
