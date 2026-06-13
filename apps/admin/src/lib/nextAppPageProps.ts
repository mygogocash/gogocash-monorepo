/**
 * Next.js 15+ passes `params` and `searchParams` as Promises on App Router pages.
 * Await them in server page components so devtools / serialization does not enumerate Promises.
 */
export type AppPageRouteParams = Record<string, string | string[] | undefined>;

export type DefaultAppPageProps = {
  params: Promise<AppPageRouteParams>;
  searchParams: Promise<AppPageRouteParams>;
};

function isFirebaseStaticExportBuild(): boolean {
  return (
    process.env.BUILD_FOR_FIREBASE === "1" ||
    process.env.NEXT_PUBLIC_FIREBASE_STATIC === "1"
  );
}

/**
 * Accepts `params`/`searchParams` from any page segment shape (including `[id]` routes).
 * For Firebase static export, only `params` is awaited so Next can prerender routes
 * (awaiting `searchParams` opts the route into dynamic rendering and breaks `output: "export"`).
 */
export async function awaitPageDynamicProps(props: {
  params: Promise<unknown>;
  searchParams: Promise<unknown>;
}): Promise<void> {
  if (isFirebaseStaticExportBuild()) {
    await props.params;
    return;
  }
  await Promise.all([props.params, props.searchParams]);
}
