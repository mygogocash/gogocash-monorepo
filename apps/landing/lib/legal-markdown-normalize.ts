/** Turn bare "Email: user@host" lines into markdown mailto links for ReactMarkdown. */
export function normalizeLegalMarkdown(content: string): string {
  return content.replace(
    /^Email:\s*([\w.+-]+@[\w.-]+\.\w+)\s*$/gim,
    "Email: [$1](mailto:$1)",
  );
}
