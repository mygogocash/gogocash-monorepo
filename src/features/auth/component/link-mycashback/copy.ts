"use client";

import enCatalog from "@/messages/en.json";
import thCatalog from "@/messages/th.json";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import type { LinkMyCashbackScreenCopy } from "./types";
import {
  GOGOCASH_ARIA_FALLBACK,
  LINK_MYCASHBACK_CARD_DESCRIPTION_FALLBACK,
  LINK_MYCASHBACK_CARD_TITLE_FALLBACK,
  LINK_MYCASHBACK_LINK_ACCOUNT_FALLBACK,
  LINK_MYCASHBACK_METHOD_BACK_FALLBACK,
  LINK_MYCASHBACK_METHOD_CONSENT_PREFIX_FALLBACK,
  LINK_MYCASHBACK_METHOD_DESCRIPTION_FALLBACK,
  LINK_MYCASHBACK_METHOD_EMAIL_LABEL_FALLBACK,
  LINK_MYCASHBACK_METHOD_EMAIL_PLACEHOLDER_FALLBACK,
  LINK_MYCASHBACK_METHOD_NEXT_FALLBACK,
  LINK_MYCASHBACK_METHOD_PHONE_LABEL_FALLBACK,
  LINK_MYCASHBACK_METHOD_PHONE_PLACEHOLDER_FALLBACK,
  LINK_MYCASHBACK_METHOD_TITLE_FALLBACK,
  LINK_MYCASHBACK_MYCASHBACK_ALT_FALLBACK,
  LINK_MYCASHBACK_PAGE_SUBTITLE_FALLBACK,
  LINK_MYCASHBACK_PAGE_TITLE_FALLBACK,
  LINK_MYCASHBACK_PRIVACY_POLICY_FALLBACK,
  LINK_MYCASHBACK_SKIP_FALLBACK,
  LINK_MYCASHBACK_VERIFY_DESC_EMAIL_FALLBACK,
  LINK_MYCASHBACK_VERIFY_SENT_TO_EMAIL_FALLBACK,
  LINK_MYCASHBACK_VERIFY_TITLE_FALLBACK,
  LINK_MYCASHBACK_GOGOCASH_LABEL_FALLBACK,
} from "./constants";

export function messagesForLocale(locale: string): Record<string, unknown> {
  if (locale === "th") {
    return thCatalog as Record<string, unknown>;
  }
  return enCatalog as Record<string, unknown>;
}

export function messageString(
  messages: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  const fromLocale = messages[key];
  if (typeof fromLocale === "string" && fromLocale.length > 0) {
    return fromLocale;
  }
  const fromEn = (enCatalog as Record<string, unknown>)[key];
  if (typeof fromEn === "string" && fromEn.length > 0) {
    return fromEn;
  }
  return fallback;
}

export function buildCopy(messages: Record<string, unknown>): LinkMyCashbackScreenCopy {
  return {
    pageTitle: messageString(messages, "linkMyCashbackTitle", LINK_MYCASHBACK_PAGE_TITLE_FALLBACK),
    pageSubtitle: messageString(
      messages,
      "linkMyCashbackSubtitle",
      LINK_MYCASHBACK_PAGE_SUBTITLE_FALLBACK
    ),
    goGoCashImageLabel: messageString(
      messages,
      "linkMyCashbackGoGoCashLabel",
      LINK_MYCASHBACK_GOGOCASH_LABEL_FALLBACK
    ),
    myCashbackImageAlt: messageString(
      messages,
      "linkMyCashbackMyCashbackAlt",
      LINK_MYCASHBACK_MYCASHBACK_ALT_FALLBACK
    ),
    cardTitle: messageString(
      messages,
      "linkMyCashbackCardTitle",
      LINK_MYCASHBACK_CARD_TITLE_FALLBACK
    ),
    cardDescription: messageString(
      messages,
      "linkMyCashbackCardDescription",
      LINK_MYCASHBACK_CARD_DESCRIPTION_FALLBACK
    ),
    skipLabel: messageString(messages, "linkMyCashbackSkip", LINK_MYCASHBACK_SKIP_FALLBACK),
    linkAccountLabel: messageString(
      messages,
      "linkMyCashbackLinkAccount",
      LINK_MYCASHBACK_LINK_ACCOUNT_FALLBACK
    ),
    goGoCashAria: messageString(messages, "GoGoCash", GOGOCASH_ARIA_FALLBACK),
    method: {
      methodTitle: messageString(
        messages,
        "linkMyCashbackMethodTitle",
        LINK_MYCASHBACK_METHOD_TITLE_FALLBACK
      ),
      methodDescription: messageString(
        messages,
        "linkMyCashbackMethodDescription",
        LINK_MYCASHBACK_METHOD_DESCRIPTION_FALLBACK
      ),
      methodPhoneLabel: messageString(
        messages,
        "linkMyCashbackMethodPhoneNumber",
        LINK_MYCASHBACK_METHOD_PHONE_LABEL_FALLBACK
      ),
      methodEmailLabel: messageString(
        messages,
        "linkMyCashbackMethodEmail",
        LINK_MYCASHBACK_METHOD_EMAIL_LABEL_FALLBACK
      ),
      methodPhonePlaceholder: messageString(
        messages,
        "linkMyCashbackMethodPhonePlaceholder",
        LINK_MYCASHBACK_METHOD_PHONE_PLACEHOLDER_FALLBACK
      ),
      methodEmailPlaceholder: messageString(
        messages,
        "linkMyCashbackMethodEmailPlaceholder",
        LINK_MYCASHBACK_METHOD_EMAIL_PLACEHOLDER_FALLBACK
      ),
      methodConsentPrefix: messageString(
        messages,
        "linkMyCashbackMethodConsentPrefix",
        LINK_MYCASHBACK_METHOD_CONSENT_PREFIX_FALLBACK
      ),
      privacyPolicyLabel: messageString(
        messages,
        "linkMyCashbackPrivacyPolicy",
        LINK_MYCASHBACK_PRIVACY_POLICY_FALLBACK
      ),
      methodBack: messageString(
        messages,
        "linkMyCashbackMethodBack",
        LINK_MYCASHBACK_METHOD_BACK_FALLBACK
      ),
      methodNext: messageString(
        messages,
        "linkMyCashbackMethodNext",
        LINK_MYCASHBACK_METHOD_NEXT_FALLBACK
      ),
    },
    verify: {
      verifyTitle: messageString(
        messages,
        "linkMyCashbackVerifyTitle",
        LINK_MYCASHBACK_VERIFY_TITLE_FALLBACK
      ),
      verifyDescriptionPhone: messageString(
        messages,
        "authPhoneOtpScreenIntro",
        "A verification code will be sent to your mobile number to confirm this action is being performed by you."
      ),
      verifyDescriptionEmail: messageString(
        messages,
        "linkMyCashbackVerifyDescriptionEmail",
        LINK_MYCASHBACK_VERIFY_DESC_EMAIL_FALLBACK
      ),
      verifySentToPhoneLabel: messageString(
        messages,
        "authPhoneOtpSentToLabel",
        "Code is sent to phone number :"
      ),
      verifySentToEmailLabel: messageString(
        messages,
        "linkMyCashbackVerifySentToEmail",
        LINK_MYCASHBACK_VERIFY_SENT_TO_EMAIL_FALLBACK
      ),
      verifyResendLabel: messageString(messages, "authPhoneResend", "Resend ?"),
      verifyOtpAriaLabel: messageString(messages, "authPhoneOtpLabel", "Verification code"),
      verifyBack: messageString(
        messages,
        "linkMyCashbackMethodBack",
        LINK_MYCASHBACK_METHOD_BACK_FALLBACK
      ),
      verifyNext: messageString(
        messages,
        "linkMyCashbackMethodNext",
        LINK_MYCASHBACK_METHOD_NEXT_FALLBACK
      ),
    },
  };
}

export function useLinkMyCashbackScreenCopy(): LinkMyCashbackScreenCopy {
  const locale = useLocale();
  return useMemo(() => buildCopy(messagesForLocale(locale)), [locale]);
}
