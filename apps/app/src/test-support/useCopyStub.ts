// Render-harness stub for useCopy. The real hook calls useIntl(), which needs the IntlProvider that
// LocaleProvider mounts — screen render tests don't mount app providers, so the hook is stubbed to a
// passthrough (renders the English copy verbatim). The translation logic itself is covered by the
// source-suite test for `translateCopy`.
export function useCopy(): (english: string) => string {
  return (english: string) => english;
}
