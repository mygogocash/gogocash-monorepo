/**
 * Single source of truth for Customer.io event names, template IDs, and trait
 * keys. Keep ALL strings sent to / received from Customer.io in this file —
 * if we ever migrate off Customer.io (Plan B in docs/CUSTOMER_IO_INTEGRATION_PLAN.md),
 * this is the only domain layer that needs to change.
 */

import { Region, RegionEU, RegionUS } from 'customerio-node';

/**
 * Event names the API fires via `track()`. Journey triggers in the C.io
 * dashboard read these names — DO NOT rename without coordinating with
 * marketing.
 */
export const CIO_EVENTS = {
  signup_completed: 'signup_completed',
  login_completed: 'login_completed',
  withdraw_requested: 'withdraw_requested',
  withdraw_paid: 'withdraw_paid',
  withdraw_rejected: 'withdraw_rejected',
  cashback_credited: 'cashback_credited',
  quest_started: 'quest_started',
  quest_completed: 'quest_completed',
  referral_signed_up: 'referral_signed_up',
  referral_payout: 'referral_payout',
  email_changed: 'email_changed',
} as const;

export type CioEventName = (typeof CIO_EVENTS)[keyof typeof CIO_EVENTS];

/**
 * Transactional template IDs in C.io. Marketing creates these in the
 * dashboard; the IDs come back as numbers. Locale suffix selects template
 * on send. Update when templates are created.
 */
export const CIO_TEMPLATES = {
  // Phase 2
  otp_login_th: process.env.CUSTOMERIO_TEMPLATE_OTP_LOGIN_TH,
  otp_login_en: process.env.CUSTOMERIO_TEMPLATE_OTP_LOGIN_EN,
  // Phase 3
  welcome_th: process.env.CUSTOMERIO_TEMPLATE_WELCOME_TH,
  welcome_en: process.env.CUSTOMERIO_TEMPLATE_WELCOME_EN,
  withdraw_requested_th: process.env.CUSTOMERIO_TEMPLATE_WITHDRAW_REQUESTED_TH,
  withdraw_requested_en: process.env.CUSTOMERIO_TEMPLATE_WITHDRAW_REQUESTED_EN,
  withdraw_paid_th: process.env.CUSTOMERIO_TEMPLATE_WITHDRAW_PAID_TH,
  withdraw_paid_en: process.env.CUSTOMERIO_TEMPLATE_WITHDRAW_PAID_EN,
} as const;

export type CioTemplateKey = keyof typeof CIO_TEMPLATES;

/**
 * User trait dictionary — fields synced via `identify()`. Marketing's
 * segmentation reads these. Adding a new trait? Add it here, then to the
 * `buildTraits()` helper in `customer-io.service.ts`.
 */
export const CIO_TRAITS = {
  email: 'email',
  mobile: 'mobile',
  country: 'country',
  locale: 'locale',
  provider: 'provider',
  created_at: 'created_at',
  membership_tier: 'membership_tier',
  cashback_total_thb: 'cashback_total_thb',
  last_purchase_at: 'last_purchase_at',
  successful_referrals: 'successful_referrals',
} as const;

export type SuppressionReason = 'bounced' | 'complained' | 'unsubscribed' | 'dropped';

/**
 * Resolve `process.env.CUSTOMERIO_REGION` to the SDK's Region enum. Falls
 * back to US (the SDK default) if unset. EU is recommended for our PDPA
 * posture (Thailand → EU data residency disclosure is cleaner than US).
 */
export function resolveRegion(): Region {
  const raw = process.env.CUSTOMERIO_REGION?.trim().toLowerCase();
  return raw === 'eu' ? RegionEU : RegionUS;
}

/**
 * Pick the right transactional template for a recipient's locale. Falls back
 * to English if the locale is unknown or its template isn't configured yet.
 */
export function pickTemplate(
  base: 'otp_login' | 'welcome' | 'withdraw_requested' | 'withdraw_paid',
  locale: string | undefined,
): string | undefined {
  const lang = locale?.toLowerCase().startsWith('th') ? 'th' : 'en';
  const key = `${base}_${lang}` as CioTemplateKey;
  return CIO_TEMPLATES[key] ?? CIO_TEMPLATES[`${base}_en` as CioTemplateKey];
}
