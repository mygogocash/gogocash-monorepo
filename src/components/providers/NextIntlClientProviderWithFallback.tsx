"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { IntlError, IntlErrorCode } from "use-intl";
import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import { createGetMessageFallback } from "@/i18n/intlMessageFallback";
import { devLogError, devLogWarn } from "@/lib/clientDevLog";

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
};

/**
 * `getMessageFallback` supplies user-visible copy for missing keys. In development we still
 * warn once per missing key so typos surface without spamming production. Turbopack HMR can
 * briefly omit flat keys — use `npm run i18n:check` for en/th parity.
 */
const missingKeyDevWarned = new Set<string>();

function onIntlError(error: InstanceType<typeof IntlError>) {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    const dedupeId = `${error.message}|${error.originalMessage ?? ""}`;
    if (!missingKeyDevWarned.has(dedupeId)) {
      missingKeyDevWarned.add(dedupeId);
      devLogWarn(
        "[next-intl] MISSING_MESSAGE (dev only). UI uses getMessageFallback. Fix key or run `npm run i18n:check`.",
        error.message,
        error.originalMessage ?? ""
      );
    }
    return;
  }
  devLogError(error);
}

/**
 * Client-side `getMessageFallback` must live here — Server Components cannot pass functions to Client Components.
 * Matches `messageLocale` logic in `src/i18n/request.ts`.
 */
export default function NextIntlClientProviderWithFallback({ locale, messages, children }: Props) {
  const messageLocale = TRANSLATIONS_DISABLED ? "en" : locale;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Bangkok"
      getMessageFallback={createGetMessageFallback(messageLocale)}
      onError={onIntlError}
    >
      {children}
    </NextIntlClientProvider>
  );
}
