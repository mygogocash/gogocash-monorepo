/**
 * Next.js 15+ passes `params` and `searchParams` as Promises on App Router pages.
 * Await them in server page components so devtools / serialization does not enumerate Promises.
 */
export type AppPageRouteParams = Record<string, string | string[] | undefined>;

export type DefaultAppPageProps = {
  params: Promise<AppPageRouteParams>;
  searchParams: Promise<AppPageRouteParams>;
};

/** Accepts `params`/`searchParams` from any page segment shape (including `[id]` routes). */
export async function awaitPageDynamicProps(props: {
  params: Promise<unknown>;
  searchParams: Promise<unknown>;
}): Promise<void> {
  await Promise.all([props.params, props.searchParams]);
}
