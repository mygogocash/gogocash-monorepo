/** Escape user input for safe use inside MongoDB `$regex` / `$options: 'i'`. */
export function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
