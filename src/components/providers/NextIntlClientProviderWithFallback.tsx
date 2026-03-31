"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { IntlError, IntlErrorCode } from "use-intl";
import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import { createGetMessageFallback } from "@/i18n/intlMessageFallback";

type Props = {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
};

/**
 * Stale Turbopack HMR chunks can briefly run an old `ConsentBanner` that still calls `t("pdpaConsent…")`.
 * Those keys are intentionally not resolved via `next-intl` anymore — suppress the duplicate console noise.
 */
function onIntlError(error: InstanceType<typeof IntlError>) {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    const detail = `${error.message} ${error.originalMessage ?? ""}`;
    if (detail.includes("pdpaConsent")) {
      return;
    }
    if (detail.includes("withdrawFormCta")) {
      return;
    }
    if (detail.includes("missingOrders")) {
      return;
    }
  }
  console.error(error);
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
      getMessageFallback={createGetMessageFallback(messageLocale)}
      onError={onIntlError}
    >
      {children}
    </NextIntlClientProvider>
  );
}
