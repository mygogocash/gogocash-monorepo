import { Injectable } from '@nestjs/common';

export const QUEST_FX_RATE_PROVIDER = Symbol('QUEST_FX_RATE_PROVIDER');

export type QuestFxQuote = {
  rate: number;
  as_of: Date;
  source: string;
};

export interface QuestFxRateProvider {
  quoteToThb(currency: string, at: Date): Promise<QuestFxQuote | null>;
}

export function completedFxReferenceDate(at: Date): string | null {
  if (Number.isNaN(at.getTime())) return null;
  // Official daily reference data for "today" can still change after an event
  // is first processed. Pin to the preceding completed UTC date so a retry of
  // the same immutable transition always asks for the same historical quote.
  const completed = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()) -
      24 * 60 * 60 * 1_000,
  );
  return completed.toISOString().slice(0, 10);
}

@Injectable()
export class DefaultQuestFxRateProvider implements QuestFxRateProvider {
  async quoteToThb(currency: string, at: Date): Promise<QuestFxQuote | null> {
    const normalized = currency.trim().toUpperCase();
    if (normalized === 'THB') {
      return { rate: 1, as_of: at, source: 'identity:THB' };
    }
    const referenceDate = completedFxReferenceDate(at);
    if (!referenceDate) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(
        `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(normalized)}/THB?date=${referenceDate}&providers=ECB`,
        { signal: controller.signal },
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        rate?: unknown;
        date?: string;
      };
      const rate = Number(payload.rate);
      if (!Number.isFinite(rate) || rate <= 0) return null;
      const asOf = payload.date
        ? new Date(`${payload.date}T00:00:00.000Z`)
        : new Date(`${referenceDate}T00:00:00.000Z`);
      const requestedAt = new Date(`${referenceDate}T23:59:59.999Z`);
      if (Number.isNaN(asOf.getTime()) || asOf > requestedAt) return null;
      return {
        rate,
        as_of: asOf,
        source: 'frankfurter:v2:ECB',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
