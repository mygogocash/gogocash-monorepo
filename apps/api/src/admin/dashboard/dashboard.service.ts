import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';

type DashboardBucket = {
  count: number;
  total: number;
  oldestAt?: string | null;
};

type DashboardWithdrawBuckets = {
  pending: DashboardBucket & { oldestAt: string | null };
  approved: DashboardBucket;
  rejected: DashboardBucket;
};

type DashboardWithdrawAggregation = {
  buckets: DashboardWithdrawBuckets;
  unknownCount: number;
};

type ConversionTotals = {
  count: number;
  totalPayout: number;
  totalSaleAmount: number;
};

type DashboardRangeWindow = {
  range: string;
  current: { from: Date; to: Date };
  prior: { from: Date; to: Date } | null;
};

type RawConversionFacets = {
  currentTotals?: unknown[];
  priorTotals?: unknown[];
  byStatus?: unknown[];
  topOffers?: unknown[];
  networkBreakdown?: unknown[];
  timeSeries?: unknown[];
};

const MS_DAY = 86_400_000;
const DASHBOARD_CURRENCY = 'THB' as const;
const BANGKOK_TIMEZONE = '+07:00';
const FINANCIAL_INCLUDED_STATUSES = ['approved', 'pending', 'paid'] as const;
const KNOWN_CONVERSION_STATUSES = new Set([
  ...FINANCIAL_INCLUDED_STATUSES,
  'rejected',
  'declined',
  'cancelled',
  'reversed',
]);

const DASHBOARD_AVAILABILITY = {
  clicks: {
    available: false,
    reason: 'Click-event analytics are not connected to this dashboard.',
  },
  commissionHealth: {
    available: false,
    reason: 'Commission-cap health is not measured by this endpoint.',
  },
  quests: {
    available: false,
    reason: 'Quest engagement and attribution analytics are not connected.',
  },
} as const;

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

function emptyWithdrawBuckets(): DashboardWithdrawBuckets {
  return {
    pending: { count: 0, total: 0, oldestAt: null },
    approved: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  };
}

function normalizeWithdrawStatus(
  status: unknown,
): keyof DashboardWithdrawBuckets | null {
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

function aggregateWithdrawBuckets(
  rows: unknown[],
): DashboardWithdrawAggregation {
  const buckets = emptyWithdrawBuckets();
  let unknownCount = 0;
  for (const raw of rows) {
    const row = raw as Record<string, unknown>;
    const status = normalizeWithdrawStatus(row._id);
    if (!status) {
      unknownCount += finiteNumber(row.count);
      continue;
    }
    buckets[status].count += finiteNumber(row.count);
    // Terminally rejected requests remain visible as a count, but they are not
    // money owed or paid and must not inflate the dashboard's financial total.
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
  return { buckets, unknownCount };
}

function parseBangkokDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const validation = new Date(Date.UTC(year, month - 1, day));
  if (
    validation.getUTCFullYear() !== year ||
    validation.getUTCMonth() !== month - 1 ||
    validation.getUTCDate() !== day
  ) {
    return null;
  }
  return new Date(`${value}T00:00:00.000${BANGKOK_TIMEZONE}`);
}

function dashboardRange(
  rawRange: string | undefined,
  now: Date,
): DashboardRangeWindow {
  const requested = rawRange?.trim() || '30d';
  const custom = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(
    requested,
  );
  if (custom) {
    const from = parseBangkokDate(custom[1]);
    const toStart = parseBangkokDate(custom[2]);
    if (from && toStart && from <= toStart) {
      const to = new Date(toStart.getTime() + MS_DAY - 1);
      const span = to.getTime() - from.getTime() + 1;
      const priorTo = new Date(from.getTime() - 1);
      return {
        range: requested,
        current: { from, to },
        prior: {
          from: new Date(priorTo.getTime() - span + 1),
          to: priorTo,
        },
      };
    }
  }

  const range = ['7d', '30d', '90d', 'all'].includes(requested)
    ? requested
    : '30d';
  if (range === 'all') {
    return {
      range,
      current: { from: new Date(0), to: now },
      prior: null,
    };
  }
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const span = days * MS_DAY;
  const from = new Date(now.getTime() - span);
  const priorTo = new Date(from.getTime() - 1);
  return {
    range,
    current: { from, to: now },
    prior: {
      from: new Date(priorTo.getTime() - span + 1),
      to: priorTo,
    },
  };
}

function conversionTotals(value: unknown): ConversionTotals {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    count: finiteNumber(row.count),
    totalPayout: roundMoney(row.totalPayout),
    totalSaleAmount: roundMoney(row.totalSaleAmount),
  };
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

function conversionMatch(window: { from: Date; to: Date }) {
  return {
    $match: {
      datetime_conversion: { $gte: window.from, $lte: window.to },
    },
  };
}

function dashboardCommercialConversionScope(window?: { from: Date; to: Date }) {
  return {
    $match: {
      quest_synthetic_reward: { $ne: true },
      // The legacy admin reward writer pre-dates the explicit marker. Keep its
      // stable reserved identity out of commercial analytics as well.
      offer_name: { $ne: 'reward_conversion_quest' },
      ...(window
        ? {
            datetime_conversion: { $gte: window.from, $lte: window.to },
          }
        : {}),
    },
  };
}

function normalizedMongoString(field: string, casing: 'lower' | 'upper') {
  const value = {
    $convert: {
      input: field,
      to: 'string',
      onError: '',
      onNull: '',
    },
  };
  return casing === 'lower' ? { $toLower: value } : { $toUpper: value };
}

function financiallyEligibleAmount(field: string) {
  return {
    $cond: [
      {
        $and: [
          {
            $eq: [
              normalizedMongoString('$currency', 'upper'),
              DASHBOARD_CURRENCY,
            ],
          },
          {
            $in: [
              normalizedMongoString('$conversion_status', 'lower'),
              FINANCIAL_INCLUDED_STATUSES,
            ],
          },
        ],
      },
      numericMongoField(field),
      0,
    ],
  };
}

function totalsGroup() {
  return {
    $group: {
      _id: null,
      // Counts cover every commercial conversion currency and status. Money is
      // fail-closed to eligible THB rows in financiallyEligibleAmount().
      count: { $sum: 1 },
      totalPayout: { $sum: financiallyEligibleAmount('$payout') },
      totalSaleAmount: {
        $sum: financiallyEligibleAmount('$sale_amount'),
      },
    },
  };
}

function networkName(networkId: string): string {
  switch (networkId) {
    case 'involve':
      return 'Involve Asia';
    case 'optimise':
      return 'Optimise';
    case 'accesstrade':
      return 'AccessTrade';
    default:
      return networkId || 'Unknown';
  }
}

function emptyQuestMetrics() {
  return {
    totalQuests: 0,
    liveNow: 0,
    scheduled: 0,
    ended: 0,
    overlappingSelectedRange: 0,
    totalParticipantsInOverlapping: 0,
    rows: [],
    engagement: {
      enrolledInOverlapping: 0,
      activeInOverlapping: 0,
      fullCompletesInOverlapping: 0,
      pointsIssuedInOverlapping: 0,
    },
    attribution: {
      attributedConversionsInPeriod: 0,
      attributedGmvInPeriod: 0,
      attributedPayoutInPeriod: 0,
      shareOfPeriodConversionsPct: null,
    },
    funnelTotals: {
      viewed: 0,
      joined: 0,
      tasksStarted: 0,
      fullyCompleted: 0,
    },
    taskMix: { offerTasks: 0, merchantTasks: 0, conditionalTasks: 0 },
    channels: {
      questsWithFacebook: 0,
      questsWithLine: 0,
      questsWithBanner: 0,
    },
    timeline: [],
    leaderboardPreview: null,
  };
}

type NormalizedStatisticsRow = {
  date: string;
  conversions: number;
  saleAmount: number;
  payout: number;
};

function statisticsBundle(
  rows: NormalizedStatisticsRow[],
  description: string,
) {
  return {
    categories: rows.map((row) => row.date),
    series: [
      { name: 'Clicks' as const, data: rows.map(() => 0) },
      {
        name: 'Conversions' as const,
        data: rows.map((row) => row.conversions),
      },
      {
        name: 'Sale Amount' as const,
        data: rows.map((row) => row.saleAmount),
      },
      {
        name: 'Estimated Earnings' as const,
        data: rows.map((row) => row.payout),
      },
    ],
    description,
  };
}

function bucketStatisticsRows(
  rows: NormalizedStatisticsRow[],
  keyForDate: (date: Date) => string,
): NormalizedStatisticsRow[] {
  const buckets = new Map<string, NormalizedStatisticsRow>();
  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) continue;
    const key = keyForDate(date);
    const bucket = buckets.get(key) ?? {
      date: key,
      conversions: 0,
      saleAmount: 0,
      payout: 0,
    };
    bucket.conversions += row.conversions;
    bucket.saleAmount = roundMoney(bucket.saleAmount + row.saleAmount);
    bucket.payout = roundMoney(bucket.payout + row.payout);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function isoCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekBucket(date: Date): string {
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return isoCalendarDate(monday);
}

function monthBucket(date: Date): string {
  return isoCalendarDate(date).slice(0, 7);
}

function quarterBucket(date: Date): string {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function yearBucket(date: Date): string {
  return String(date.getUTCFullYear());
}

function statisticsFromTimeSeries(rows: unknown[], range: string) {
  const normalized = rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      date: String(row._id ?? ''),
      conversions: finiteNumber(row.count),
      saleAmount: roundMoney(row.totalSaleAmount),
      payout: roundMoney(row.totalPayout),
    };
  });
  return {
    day: statisticsBundle(
      normalized,
      `Daily conversion activity for the selected ${range} range`,
    ),
    week: statisticsBundle(
      bucketStatisticsRows(normalized, weekBucket),
      `Weekly conversion activity for the selected ${range} range`,
    ),
    month: statisticsBundle(
      bucketStatisticsRows(normalized, monthBucket),
      `Monthly conversion activity for the selected ${range} range`,
    ),
    quarter: statisticsBundle(
      bucketStatisticsRows(normalized, quarterBucket),
      `Quarterly conversion activity for the selected ${range} range`,
    ),
    year: statisticsBundle(
      bucketStatisticsRows(normalized, yearBucket),
      `Annual conversion activity for the selected ${range} range`,
    ),
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(UserMyCashback.name)
    private readonly myCashbackModel: Model<UserMyCashback>,
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Withdraw.name)
    private readonly withdrawModel: Model<Withdraw>,
  ) {}

  async getStats() {
    const [gogocashUsers, mycashbackUsers] = await Promise.all([
      this.userModel.countDocuments(),
      this.myCashbackModel.countDocuments(),
    ]);
    return { gogocashUsers, mycashbackUsers };
  }

  async getSummary() {
    const now = new Date();
    const [conversionRows, withdrawRows] = await Promise.all([
      this.conversionModel.aggregate([
        dashboardCommercialConversionScope(),
        totalsGroup(),
      ]),
      this.aggregateWithdraws(),
    ]);
    const conversions = conversionTotals(conversionRows[0]);
    const withdrawals = aggregateWithdrawBuckets(withdrawRows);
    return {
      currency: DASHBOARD_CURRENCY,
      conversionCount: conversions.count,
      conversionTotalPayout: conversions.totalPayout,
      conversionTotalSaleAmount: conversions.totalSaleAmount,
      lastUpdated: now.toISOString(),
      withdrawByStatus: withdrawals.buckets,
    };
  }

  async getInsights(rawRange = '30d') {
    const now = new Date();
    const window = dashboardRange(rawRange, now);
    const earliestConversionBoundary =
      window.prior?.from ?? window.current.from;
    const currentUserFilter = { createdAt: { $lte: window.current.to } };
    const priorUserFilter = window.prior
      ? { createdAt: { $lte: window.prior.to } }
      : null;
    const priorTotals = window.prior
      ? [conversionMatch(window.prior), totalsGroup()]
      : [{ $match: { $expr: { $eq: [1, 0] } } }, totalsGroup()];

    const [
      gogocashUsers,
      mycashbackUsers,
      priorGogocashUsers,
      priorMycashbackUsers,
      newUsersInPeriod,
      conversionRows,
      withdrawRows,
      pendingOver48hCount,
    ] = await Promise.all([
      this.userModel.countDocuments(currentUserFilter),
      this.myCashbackModel.countDocuments(currentUserFilter),
      priorUserFilter
        ? this.userModel.countDocuments(priorUserFilter)
        : Promise.resolve<number | null>(null),
      priorUserFilter
        ? this.myCashbackModel.countDocuments(priorUserFilter)
        : Promise.resolve<number | null>(null),
      this.userModel.countDocuments({
        createdAt: { $gte: window.current.from, $lte: window.current.to },
      }),
      this.conversionModel.aggregate([
        dashboardCommercialConversionScope({
          from: earliestConversionBoundary,
          to: window.current.to,
        }),
        {
          // Keep the all-history facet bounded to fields its reduced outputs
          // actually need. In particular, raw provider payloads never enter it.
          $project: {
            _id: 1,
            datetime_conversion: 1,
            conversion_status: 1,
            currency: 1,
            payout: 1,
            sale_amount: 1,
            offer_id: 1,
            offer_name: 1,
            merchant_id: 1,
            source: 1,
            provider_account: 1,
            network_account: 1,
          },
        },
        {
          $facet: {
            currentTotals: [conversionMatch(window.current), totalsGroup()],
            priorTotals,
            byStatus: [
              conversionMatch(window.current),
              {
                $group: {
                  _id: {
                    $toLower: {
                      $ifNull: ['$conversion_status', 'unknown'],
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
            topOffers: [
              conversionMatch(window.current),
              {
                $group: {
                  _id: {
                    networkId: {
                      $toLower: { $ifNull: ['$source', 'involve'] },
                    },
                    providerAccount: {
                      $ifNull: [
                        '$provider_account',
                        { $ifNull: ['$network_account', 'default'] },
                      ],
                    },
                    offerId: '$offer_id',
                  },
                  latest: {
                    $top: {
                      sortBy: { datetime_conversion: -1, _id: -1 },
                      output: {
                        offerName: '$offer_name',
                        merchantId: '$merchant_id',
                      },
                    },
                  },
                  conversions: { $sum: 1 },
                  gmv: {
                    $sum: financiallyEligibleAmount('$sale_amount'),
                  },
                  payout: { $sum: financiallyEligibleAmount('$payout') },
                },
              },
              {
                $sort: {
                  conversions: -1,
                  '_id.networkId': 1,
                  '_id.providerAccount': 1,
                  '_id.offerId': 1,
                },
              },
              { $limit: 8 },
            ],
            networkBreakdown: [
              conversionMatch(window.current),
              {
                $group: {
                  _id: {
                    $toLower: { $ifNull: ['$source', 'involve'] },
                  },
                  offerIds: {
                    $addToSet: {
                      offerId: '$offer_id',
                      providerAccount: {
                        $ifNull: [
                          '$provider_account',
                          { $ifNull: ['$network_account', 'default'] },
                        ],
                      },
                    },
                  },
                  conversions: { $sum: 1 },
                  gmv: {
                    $sum: financiallyEligibleAmount('$sale_amount'),
                  },
                  payout: { $sum: financiallyEligibleAmount('$payout') },
                },
              },
              { $sort: { conversions: -1, _id: 1 } },
            ],
            timeSeries: [
              conversionMatch(window.current),
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$datetime_conversion',
                      timezone: BANGKOK_TIMEZONE,
                    },
                  },
                  count: { $sum: 1 },
                  totalPayout: {
                    $sum: financiallyEligibleAmount('$payout'),
                  },
                  totalSaleAmount: {
                    $sum: financiallyEligibleAmount('$sale_amount'),
                  },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),
      this.aggregateWithdraws(),
      this.withdrawModel.countDocuments({
        currency: DASHBOARD_CURRENCY,
        status: 'pending',
        createdAt: { $lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      }),
    ]);

    const facets = (conversionRows[0] ?? {}) as RawConversionFacets;
    const current = conversionTotals(facets.currentTotals?.[0]);
    const prior = window.prior
      ? conversionTotals(facets.priorTotals?.[0])
      : null;
    const withdrawAggregation = aggregateWithdrawBuckets(withdrawRows);
    const buckets = withdrawAggregation.buckets;
    const decided = buckets.approved.count + buckets.rejected.count;
    const payoutRatio =
      current.totalSaleAmount > 0
        ? Math.round(
            (current.totalPayout / current.totalSaleAmount) * 100_000,
          ) / 100_000
        : null;

    const conversionsByStatus: Record<string, number> = {};
    for (const raw of facets.byStatus ?? []) {
      const row = raw as Record<string, unknown>;
      const status = String(row._id ?? 'unknown');
      conversionsByStatus[status] = finiteNumber(row.count);
    }

    const topOffers = (facets.topOffers ?? []).map((raw) => {
      const row = raw as Record<string, unknown>;
      const id = (row._id ?? {}) as Record<string, unknown>;
      const latest = (row.latest ?? {}) as Record<string, unknown>;
      return {
        offerId: finiteNumber(id.offerId),
        offerName: String(latest.offerName ?? 'Unknown offer'),
        merchantId: finiteNumber(latest.merchantId),
        networkId: String(id.networkId ?? 'involve'),
        providerAccount: String(id.providerAccount ?? 'default'),
        conversions: finiteNumber(row.conversions),
        gmv: roundMoney(row.gmv),
        payout: roundMoney(row.payout),
        currency: DASHBOARD_CURRENCY,
      };
    });

    const networkBreakdown = (facets.networkBreakdown ?? []).map((raw) => {
      const row = raw as Record<string, unknown>;
      const networkId = String(row._id ?? 'unknown');
      return {
        networkId,
        networkName: networkName(networkId),
        offersCount: Array.isArray(row.offerIds) ? row.offerIds.length : 0,
        conversions: finiteNumber(row.conversions),
        gmv: roundMoney(row.gmv),
        payout: roundMoney(row.payout),
        currency: DASHBOARD_CURRENCY,
      };
    });

    const alerts: Array<{
      id: string;
      severity: 'low' | 'medium' | 'high';
      title: string;
      body: string;
      href: string;
      metric: string;
    }> = [];
    if (buckets.pending.count > 0) {
      alerts.push({
        id: 'withdraw-pending',
        severity: 'medium',
        title: 'Withdrawal queue needs attention',
        body: `${buckets.pending.count} pending request(s) (${buckets.pending.total.toLocaleString()} total).`,
        href: '/withdraw?status=pending',
        metric: 'pending_withdrawals',
      });
    }
    const unknownConversionCount = Object.entries(conversionsByStatus).reduce(
      (total, [status, count]) =>
        KNOWN_CONVERSION_STATUSES.has(status) ? total : total + count,
      0,
    );
    if (unknownConversionCount > 0) {
      alerts.push({
        id: 'conversion-status-unknown',
        severity: 'high',
        title: 'Unknown conversion statuses require review',
        body: `${unknownConversionCount} conversion(s) have an unrecognized status. Their money is excluded until normalized.`,
        href: '/conversion',
        metric: 'unknown_conversion_statuses',
      });
    }
    if (withdrawAggregation.unknownCount > 0) {
      alerts.push({
        id: 'withdraw-status-unknown',
        severity: 'high',
        title: 'Unknown withdrawal statuses require review',
        body: `${withdrawAggregation.unknownCount} withdrawal request(s) have an unrecognized status and are excluded from status totals.`,
        href: '/withdraw',
        metric: 'unknown_withdraw_statuses',
      });
    }

    return {
      lastUpdated: now.toISOString(),
      range: window.range,
      currency: DASHBOARD_CURRENCY,
      availability: DASHBOARD_AVAILABILITY,
      period: {
        from: window.current.from.toISOString(),
        to: window.current.to.toISOString(),
      },
      kpis: {
        current: {
          gogocashUsers,
          mycashbackUsers,
          conversionCount: current.count,
          conversionTotalPayout: current.totalPayout,
          conversionTotalSaleAmount: current.totalSaleAmount,
        },
        prior:
          prior == null
            ? null
            : {
                gogocashUsers: priorGogocashUsers ?? 0,
                mycashbackUsers: priorMycashbackUsers ?? 0,
                conversionCount: prior.count,
                conversionTotalPayout: prior.totalPayout,
                conversionTotalSaleAmount: prior.totalSaleAmount,
              },
        newUsersInPeriod,
      },
      withdrawByStatus: buckets,
      withdrawMetrics: {
        approvalRatePct:
          decided > 0
            ? Math.round((buckets.approved.count / decided) * 1000) / 10
            : null,
        pendingOver48hCount,
        rejectedSharePct:
          decided > 0
            ? Math.round((buckets.rejected.count / decided) * 1000) / 10
            : null,
      },
      conversionsByStatus,
      payoutRatio,
      topOffers,
      networkBreakdown,
      commissionHealth: {
        missingAdminCap: 0,
        missingPartnerCap: 0,
        adminOverPartner: 0,
      },
      alerts,
      insightSummary:
        current.count > 0 || buckets.pending.count > 0
          ? `${current.count} conversion(s) in the selected period; ${buckets.pending.count} withdrawal(s) pending review.`
          : 'No conversion or withdrawal activity was found for the selected period.',
      statistics: statisticsFromTimeSeries(
        facets.timeSeries ?? [],
        window.range,
      ),
      quests: emptyQuestMetrics(),
    };
  }

  private aggregateWithdraws() {
    return this.withdrawModel.aggregate([
      { $match: { currency: DASHBOARD_CURRENCY } },
      {
        $group: {
          _id: { $toLower: { $ifNull: ['$status', 'unknown'] } },
          count: { $sum: 1 },
          totalAmount: { $sum: numericMongoField('$amount_total') },
          oldestAt: { $min: '$createdAt' },
        },
      },
    ]);
  }
}
