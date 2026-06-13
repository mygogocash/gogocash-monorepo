import { buildFaqPageSchema, type FaqSchemaItem } from "@/lib/faq-schema";

/**
 * Per-page FAQPage JSON-LD (#18). Server-rendered into the static HTML so each
 * locale home emits structured data in its own language. Render alongside the
 * visible FAQ accordion with the same items.
 */
export default function FaqJsonLd({
  items,
}: {
  items: readonly FaqSchemaItem[];
}) {
  if (items.length === 0) return null;
  // Escape `<` so a literal "</script>" in trusted FAQ copy can't break out.
  const json = JSON.stringify(buildFaqPageSchema(items)).replace(
    /</g,
    "\\u003c",
  );
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
