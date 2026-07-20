import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';

const SNAPSHOT_CURRENCY = 'THB' as const;
const DEFAULT_TTL_SEC = 90;

type SnapshotBucket = {
  count: number;
  total: number;
  oldestAt?: string | null;
};

export type OrionWithdrawBuckets = {
  pending: SnapshotBucket & { oldestAt: string | null };
  approved: SnapshotBucket;
  rejected: SnapshotBucket;
};

export type OrionContextSnapshot = {
  generatedAt: string;
  currency: typeof SNAPSHOT_CURRENCY;
  cached: boolean;
  withdrawByStatus: OrionWithdrawBuckets;
  unknownWithdrawCount: number;
  /** Phase 0 stub — offer inventory context arrives in a later phase. */
  offers: {
    stub: true;
    liveCount: null;
    note: string;
  };
};

type CacheEntry = {
  expiresAt: number;
  value: OrionContextSnapshot;
};

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: unknown): number {
  return Math.round(finiteNumber(value) * 100) / 100;
}

function isoDate(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numericMongoField(field: string) {
  return {
    $convert: {
      input: field,
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  };
}

function emptyBuckets(): OrionWithdrawBuckets {
  return {
    pending: { count: 0, total: 0, oldestAt: null },
    approved: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  };
}

function normalizeWithdrawStatus(
  status: unknown,
): keyof OrionWithdrawBuckets | null {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'pending') return 'pending';
  if (
    normalized === 'approved' ||
    normalized === 'completed' ||
    normalized === 'paid'
  ) {
    return 'approved';
  }
  if (
    normalized === 'rejected' ||
    normalized === 'declined' ||
    normalized === 'cancelled'
  ) {
    return 'rejected';
  }
  return null;
}

function resolveTtlMs(): number {
  const raw = Number(process.env.ORION_SNAPSHOT_TTL_SEC ?? DEFAULT_TTL_SEC);
  const seconds =
    Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULT_TTL_SEC;
  return seconds * 1000;
}

@Injectable()
export class OrionSnapshotService {
  private readonly logger = new Logger(OrionSnapshotService.name);
  private cache: CacheEntry | null = null;

  constructor(
    @InjectModel(Withdraw.name) private readonly withdrawModel: Model<Withdraw>,
  ) {}

  /** Test seam: drop the in-memory TTL cache. */
  clearCache(): void {
    this.cache = null;
  }

  async getSnapshot(): Promise<OrionContextSnapshot> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return { ...this.cache.value, cached: true };
    }

    const value = await this.buildSnapshot();
    const ttlMs = resolveTtlMs();
    if (ttlMs > 0) {
      this.cache = { expiresAt: now + ttlMs, value };
    } else {
      this.cache = null;
    }
    return { ...value, cached: false };
  }

  private async buildSnapshot(): Promise<OrionContextSnapshot> {
    const rows = await this.withdrawModel.aggregate([
      { $match: { currency: SNAPSHOT_CURRENCY } },
      {
        $group: {
          _id: { $toLower: { $ifNull: ['$status', 'unknown'] } },
          count: { $sum: 1 },
          totalAmount: { $sum: numericMongoField('$amount_total') },
          oldestAt: { $min: '$createdAt' },
        },
      },
    ]);

    const buckets = emptyBuckets();
    let unknownWithdrawCount = 0;
    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const status = normalizeWithdrawStatus(row._id);
      if (!status) {
        unknownWithdrawCount += finiteNumber(row.count);
        continue;
      }
      buckets[status].count += finiteNumber(row.count);
      // Rejected is count-only (not money owed) — matches dashboard buckets.
      if (status !== 'rejected') {
        buckets[status].total = roundMoney(
          buckets[status].total + finiteNumber(row.totalAmount),
        );
      }
      if (status === 'pending') {
        const oldestAt = isoDate(row.oldestAt);
        if (
          oldestAt &&
          (!buckets.pending.oldestAt || oldestAt < buckets.pending.oldestAt)
        ) {
          buckets.pending.oldestAt = oldestAt;
        }
      }
    }

    this.logger.debug(
      `ORION snapshot built: pending=${buckets.pending.count} approved=${buckets.approved.count} rejected=${buckets.rejected.count}`,
    );

    return {
      generatedAt: new Date().toISOString(),
      currency: SNAPSHOT_CURRENCY,
      cached: false,
      withdrawByStatus: buckets,
      unknownWithdrawCount,
      offers: {
        stub: true,
        liveCount: null,
        note: 'Offers context stub — Phase 0 does not query the offer catalogue.',
      },
    };
  }
}
