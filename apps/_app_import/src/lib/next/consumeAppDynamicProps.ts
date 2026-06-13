/**
 * Await `params` and `searchParams` in a Server Component `page.tsx` before rendering
 * a client child. Prevents devtools / element pickers from enumerating Promise props on
 * client components (Next.js 16+).
 *
 * @see https://nextjs.org/docs/messages/sync-dynamic-apis
 */
export async function consumeAppDynamicProps(props: {
  params: Promise<unknown>;
  searchParams: Promise<unknown>;
}): Promise<void> {
  await props.params;
  await props.searchParams;
}
