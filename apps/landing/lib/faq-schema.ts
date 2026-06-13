export type FaqSchemaItem = { question: string; answer: string };

type FaqQuestion = {
  "@type": "Question";
  name: string;
  acceptedAnswer: { "@type": "Answer"; text: string };
};

export type FaqPageSchema = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: FaqQuestion[];
};

/**
 * Build a schema.org FAQPage from Q&A pairs (issue #18). Locale-agnostic — the
 * caller passes the localized FAQ so each route emits its own structured data.
 */
export function buildFaqPageSchema(
  items: readonly FaqSchemaItem[],
): FaqPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
