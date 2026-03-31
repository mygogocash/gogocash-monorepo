"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import { createGetMessageFallback } from "@/i18n/intlMessageFallback";

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
};

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
      getMessageFallback={createGetMessageFallback(messageLocale)}
    >
      {children}
    </NextIntlClientProvider>
  );
}
