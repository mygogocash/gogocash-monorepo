"use client";

import { useState } from "react";

/**
 * Local Sentry verification (see Sentry Next.js onboarding).
 * Open /sentry-example-page (redirects to /en/sentry-example-page) or /en/sentry-example-page directly.
 */
export default function SentryExamplePage() {
  const [clicked, setClicked] = useState(false);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Sentry example page</h1>
      <p className="text-sm text-neutral-600">
        Set <code className="rounded bg-neutral-100 px-1">NEXT_PUBLIC_SENTRY_DSN</code> in{" "}
        <code className="rounded bg-neutral-100 px-1">.env.local</code>, run the dev server, click a
        button, then check your project&apos;s Issues in Sentry.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          onClick={() => {
            setClicked(true);
            throw new Error("Sentry example page — test error from button");
          }}
        >
          Throw test error
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
          onClick={() => {
            setClicked(true);
            // Same as calling an undefined global (ReferenceError); avoids `eval` for tooling.
            new Function("myUndefinedFunction()")();
          }}
        >
          Trigger myUndefinedFunction() (ReferenceError)
        </button>
      </div>
      {clicked ? (
        <p className="text-xs text-neutral-500">
          If an error was thrown, check the browser console and Sentry Issues.
        </p>
      ) : null}
    </main>
  );
}
