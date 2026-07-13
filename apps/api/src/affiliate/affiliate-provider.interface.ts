/**
 * Affiliate provider seam.
 *
 * GoGoCash integrates several affiliate networks (Involve Asia today; Optimise
 * Media and Accesstrade next). This port is the ONE narrow surface every
 * network module implements so callers (offer sync cron, admin commission
 * refresh, deeplink minting) never `import` a concrete network service.
 *
 * The port is deliberately minimal. It covers exactly the three cross-network
 * operations that already have callers today:
 *   - offer catalogue sync   (syncOffers)
 *   - tracking-link minting   (mintTrackingLink)
 *   - single-offer refresh    (refreshOffer, for the admin commission fetch)
 *
 * DELIBERATELY OUT OF THE PORT: conversion pulls (the periodic "fetch new
 * conversions from the network" jobs). Those are NOT part of this interface on
 * purpose:
 *   1. Module cycle — the Involve conversion pull lives in
 *      withdraw/cronjob/job.service.ts (JobService), and WithdrawModule is a
 *      heavy money-path module. Pulling that behind this port would drag the
 *      affiliate seam into the withdraw/point graph and create an import cycle.
 *   2. Money-path stability — conversions feed cashback balances, points and
 *      withdrawals. That code is load-bearing and already tested where it
 *      lives; it must stay in withdraw/cronjob/job.service.ts, untouched by
 *      this refactor. Each network module owns its own conversion cron.
 */

/** Affiliate network an offer / deeplink / conversion originated from. */
export type NetworkSource = 'involve' | 'optimise' | 'accesstrade';

/**
 * The narrow port each affiliate network adapter implements. Callers depend on
 * this interface (resolved via {@link AffiliateProviderRegistry}) rather than on
 * any concrete network service.
 */
export interface AffiliateNetworkProvider {
  /** Network this adapter speaks for. Stable, used as the registry key. */
  readonly source: NetworkSource;

  /**
   * Whether the network is wired up in this environment (credentials present).
   * Callers check this before dispatching — a provider can be registered but
   * disabled (secret unset), in which case it is skipped.
   */
  isEnabled(): boolean;

  /**
   * Pull the network's offer catalogue and upsert it into the local store.
   * @returns the number of offers upserted this run.
   */
  syncOffers(): Promise<{ upserted: number }>;

  /**
   * Mint (or reuse) a user-scoped tracking deeplink for an offer.
   * @returns the tracking deeplink URL, normalized to `{ deeplink }`.
   */
  mintTrackingLink(req: {
    userId: string;
    offerId: number;
    merchantId: number;
    targetUrl?: string;
  }): Promise<{ deeplink: string }>;

  /**
   * Live-refresh a single offer's commercial fields from the network and return
   * the patch to apply (commissions / tracking_link / commission_tracking), or
   * `null` when nothing changed. The caller persists the patch.
   */
  refreshOffer(
    offer: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>;
}

/**
 * DI token for the array of registered {@link AffiliateNetworkProvider}s. The
 * affiliate module binds this to a factory over the concrete adapters; the
 * registry injects it.
 */
export const AFFILIATE_PROVIDERS = Symbol('AFFILIATE_PROVIDERS');
