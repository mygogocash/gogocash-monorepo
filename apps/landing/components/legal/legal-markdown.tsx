import ReactMarkdown from "react-markdown";
import { normalizeLegalMarkdown } from "@/lib/legal-markdown-normalize";

export function LegalMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-4 [overflow-wrap:anywhere]">
      <ReactMarkdown
        allowedElements={[
          "a",
          "em",
          "h2",
          "h3",
          "h6",
          "hr",
          "li",
          "ol",
          "p",
          "strong",
          "ul",
        ]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="font-medium text-primary underline-offset-2 hover:underline"
            />
          ),
          em: ({ ...props }) => <em {...props} className="italic" />,
          h2: ({ ...props }) => (
            <h2
              {...props}
              className="scroll-mt-28 text-2xl font-semibold tracking-tight text-gray-900"
            />
          ),
          h3: ({ ...props }) => (
            <h3
              {...props}
              className="scroll-mt-24 text-lg font-semibold text-gray-900"
            />
          ),
          h6: ({ ...props }) => (
            <h2
              {...props}
              className="scroll-mt-28 text-base font-semibold tracking-tight text-gray-900"
            />
          ),
          hr: ({ ...props }) => (
            <hr {...props} className="my-8 border-gray-200" />
          ),
          li: ({ ...props }) => (
            <li {...props} className="text-gray-600 marker:text-gray-400" />
          ),
          ol: ({ ...props }) => (
            <ol
              {...props}
              className="list-decimal space-y-2 pl-5 text-gray-600"
            />
          ),
          p: ({ ...props }) => <p {...props} className="text-gray-600" />,
          strong: ({ ...props }) => (
            <strong {...props} className="font-semibold text-gray-800" />
          ),
          ul: ({ ...props }) => (
            <ul
              {...props}
              className="list-disc space-y-2 pl-5 text-gray-600"
            />
          ),
        }}
      >
        {normalizeLegalMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
