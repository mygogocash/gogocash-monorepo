/**
 * Next.js 15+ passes `params` and `searchParams` as Promises on App Router pages.
 * Await `params` in server page components so devtools / serialization does not enumerate
 * the Promise.
 */
export type AppPageRouteParams = Record<string, string | string[] | undefined>;

export type DefaultAppPageProps = {
  params: Promise<AppPageRouteParams>;
  searchParams: Promise<AppPageRouteParams>;
};

/**
 * Accepts `params`/`searchParams` from any page segment shape (including `[id]` routes).
 *
 * Awaits ONLY `params` — never `searchParams`. Awaiting `searchParams` opts the route into
 * dynamic rendering, and on a route that also declares `generateStaticParams` (every `[id]`
 * page here) Next throws "Page changed from static to dynamic at runtime" → a hard 500. That
 * was the Quest edit 500 (2026-07-22): `/quest/[questId]/edit` has `generateStaticParams`, and
 * the old helper `await`ed `searchParams` in the standalone build, flipping it dynamic at
 * runtime. It also breaks `output: "export"` for the Firebase build. No server page reads the
 * `searchParams` value here (the one page that needs it uses the client `useSearchParams`
 * hook), so awaiting only `params` is safe and fixes every `[id]` route at once.
 */
export async function awaitPageDynamicProps(props: {
  params: Promise<unknown>;
  searchParams: Promise<unknown>;
}): Promise<void> {
  await props.params;
}
