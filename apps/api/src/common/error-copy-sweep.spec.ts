import { readFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Source-pin sweep for the user-facing error-copy standard. These messages are
 * the ONLY part of an HttpException that survives SanitisedExceptionFilter and
 * reaches API clients, so they must be plain-language, actionable, and free of
 * internal leaks (env-var names, provider identities, raw upstream strings,
 * internal routes). Diagnostic detail is preserved server-side via loggers.
 *
 * Pins the NEW copy and asserts the OLD leaky copy is gone. If you intentionally
 * reword a message, update the expectation here in the same change.
 */
const SRC = resolve(__dirname, '..');
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');

describe('error-copy standard (user-facing HttpException messages)', () => {
  it('media/r2-object-storage.service.ts > no env-var / config leaks', () => {
    const src = read('media/r2-object-storage.service.ts');
    expect(src).toContain(
      'Media uploads are currently disabled. Please try again later or contact an administrator.',
    );
    expect(src).toContain(
      'Media storage is temporarily unavailable. Please try again later or contact support.',
    );
    expect(src).toContain("We couldn't upload your file right now.");
    expect(src).toContain('This file is too large. Please upload a file under');
    expect(src).not.toContain('MEDIA_UPLOAD_DISABLED=true');
    // The env-var names may remain in a server-side logger.error, but the
    // client-facing "(set R2_BUCKET, ...)" hint must be gone.
    expect(src).not.toContain('set R2_BUCKET');
    expect(src).not.toContain('Check the R2_* configuration');
    expect(src).not.toContain('maximum size of ${maxBytes} bytes');
  });

  it('google-drive/google-drive.service.ts > no GOOGLE_* credential leak', () => {
    const src = read('google-drive/google-drive.service.ts');
    expect(src).toContain(
      'Image uploads are temporarily unavailable. Please try again later or contact an administrator.',
    );
    expect(src).not.toContain('Google Drive is not configured');
    expect(src).not.toContain('GOOGLE_* credentials');
  });

  it('catalog/media.service.ts > no R2_* var leak in message', () => {
    const src = read('catalog/media.service.ts');
    expect(src).toContain(
      'Media uploads are temporarily unavailable. Please try again later or contact an administrator.',
    );
    expect(src).not.toContain('Catalog media uploads require');
  });

  it('customer-billing/customer-billing.service.ts > no STRIPE_* / provider leak', () => {
    const src = read('customer-billing/customer-billing.service.ts');
    expect(src).toContain(
      "This plan isn't available right now. Please try again later or contact support.",
    );
    expect(src).toContain(
      'Billing is temporarily unavailable. Please try again later or contact support.',
    );
    expect(src).not.toContain('STRIPE_PRICE_');
    expect(src).not.toContain('Price is not configured');
    expect(src).not.toContain('Stripe billing is disabled');
  });

  it('auth/auth.controller.ts > no "Firebase token" leak', () => {
    const src = read('auth/auth.controller.ts');
    expect(src).toContain('Your session is missing. Please sign in again.');
    expect(src).not.toContain('Firebase token is required');
  });

  it('auth/auth.service.ts > no raw provider / SIWE jargon leak', () => {
    const src = read('auth/auth.service.ts');
    expect(src).toContain(
      "Your sign-in couldn't be verified. Please sign in again.",
    );
    expect(src).toContain('Please reconnect your wallet and try again.');
    expect(src).toContain('Your wallet sign-in request expired.');
    expect(src).not.toContain('Invalid Firebase token');
    expect(src).not.toContain('Invalid SIWE signature');
    expect(src).not.toContain('SIWE domain mismatch');
    expect(src).not.toContain('SIWE message expired or in the future');
  });

  it('auth/firebase-auth.guard.ts > no raw upstream token message leak', () => {
    const src = read('auth/firebase-auth.guard.ts');
    expect(src).toContain('Your session has expired. Please sign in again.');
    expect(src).not.toContain("'Invalid token'");
  });

  it('admin/jwt-auth-admin.guard.ts > no raw upstream token message leak', () => {
    const src = read('admin/jwt-auth-admin.guard.ts');
    expect(src).toContain(
      'Your admin session has expired. Please sign in again.',
    );
    expect(src).not.toContain("'Invalid token'");
  });

  it('auth/jwt-auth.guard.ts > no Crossmint / internal route leak', () => {
    const src = read('auth/jwt-auth.guard.ts');
    expect(src).toContain(
      'This sign-in method is no longer available. Please sign in with your usual method.',
    );
    expect(src).not.toContain('Crossmint sign-in is disabled');
    expect(src).not.toContain('/auth/minipay-siwe');
  });

  it('catalog/providers/stripe-commerce-payment.provider.ts > no "Stripe" leak in user copy', () => {
    const src = read('catalog/providers/stripe-commerce-payment.provider.ts');
    expect(src).toContain(
      'Payments are temporarily unavailable. Please try again later or contact support.',
    );
    expect(src).not.toContain('Stripe commerce is not configured');
    expect(src).not.toContain('Stripe checkout session did not return');
  });

  it('customer-billing/stripe-customer-billing.provider.ts > no "Stripe" leak', () => {
    const src = read('customer-billing/stripe-customer-billing.provider.ts');
    expect(src).toContain(
      'Billing is temporarily unavailable. Please try again later or contact support.',
    );
    expect(src).not.toContain('Stripe is not configured');
  });

  it('common/api-key.guard.ts > no "API key not configured" leak', () => {
    const src = read('common/api-key.guard.ts');
    expect(src).toContain(
      'This service is temporarily unavailable. Please try again later.',
    );
    expect(src).not.toContain('Endpoint disabled: API key not configured');
  });

  it('involve/involve-postback-token.guard.ts > no "postback secret" leak', () => {
    const src = read('involve/involve-postback-token.guard.ts');
    expect(src).toContain(
      'This service is temporarily unavailable. Please try again later.',
    );
    expect(src).not.toContain(
      'Endpoint disabled: postback secret not configured',
    );
  });

  it('withdraw/withdraw.service.ts > friendly, leak-free withdrawal copy', () => {
    const src = read('withdraw/withdraw.service.ts');
    expect(src).toContain(
      'Withdrawals are temporarily unavailable. Please try again later or contact support.',
    );
    expect(src).toContain(
      "We couldn't complete your withdrawal right now. No funds were moved",
    );
    expect(src).toContain('can only be marked paid while it is pending');
    expect(src).toContain(
      'This legacy quest has no immutable reward snapshot. Reconcile it before enabling payouts.',
    );
    expect(src).not.toContain('Fee rate not found');
    expect(src).not.toContain('Failed to record withdrawal on chain');
    expect(src).not.toContain('Only pending withdrawals can be marked paid');
    expect(src).not.toContain('Reward list not found');
  });

  it('gototrack/gototrack.service.ts > no internal affiliate-network jargon', () => {
    const src = read('gototrack/gototrack.service.ts');
    expect(src).not.toContain('GoGoTrack affiliate network is unavailable.');
  });

  it('involve/involve.service.ts > no internal affiliate-network jargon', () => {
    const src = read('involve/involve.service.ts');
    expect(src).not.toContain('GoGoTrack affiliate network sign-in failed.');
  });

  it('point/point.service.ts > friendly no-quest copy', () => {
    const src = read('point/point.service.ts');
    expect(src).toContain(
      'There are no active quests right now. Please check back later.',
    );
    expect(src).not.toContain('No open quest available');
  });

  it('auth/rate-limit.guard.ts > friendly rate-limit copy', () => {
    const src = read('auth/rate-limit.guard.ts');
    expect(src).toContain(
      "You're making requests too quickly. Please wait a moment and try again.",
    );
    expect(src).not.toContain("message: 'Too many requests'");
  });

  it('admin/roles.guard.ts > friendly permission copy', () => {
    const src = read('admin/roles.guard.ts');
    expect(src).toContain(
      "You don't have permission for this action. Ask an administrator if you need access.",
    );
    expect(src).not.toContain('Insufficient admin role');
  });

  it('admin/subscriptions/subscriptions.service.ts > plain unsupported-action copy', () => {
    const src = read('admin/subscriptions/subscriptions.service.ts');
    expect(src).toContain(
      "This action isn't supported. Please refresh and try again.",
    );
    expect(src).not.toContain('Unknown action:');
  });

  it('catalog/commerce-order-status.ts > plain transition copy', () => {
    const src = read('catalog/commerce-order-status.ts');
    expect(src).toContain("This order status change isn't allowed.");
    expect(src).not.toContain('Unsupported status transition');
  });

  it('common/mongo-query.ts > plain invalid-id copy', () => {
    const src = read('common/mongo-query.ts');
    expect(src).toContain('you provided is not valid');
    expect(src).not.toContain('Invalid ${label}');
  });
});
