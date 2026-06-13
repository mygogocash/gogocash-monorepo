import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * `/` has no `[locale]` segment; next-intl proxy may not run on all hosts (e.g. App Hosting).
 * Redirect bare `/` to the default locale so the marketing home at `/en` (and `/th`) is reachable.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
