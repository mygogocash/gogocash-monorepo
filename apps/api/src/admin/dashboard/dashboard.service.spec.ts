import { DashboardService } from './dashboard.service';

describe('DashboardService response contract', () => {
  const userModel = {
    countDocuments: jest.fn(),
  };
  const myCashbackModel = {
    countDocuments: jest.fn(),
  };
  const conversionModel = {
    aggregate: jest.fn(),
  };
  const withdrawModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
    jest.clearAllMocks();
    service = new DashboardService(
      userModel as never,
      myCashbackModel as never,
      conversionModel as never,
      withdrawModel as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the user-count names consumed by Admin', async () => {
    userModel.countDocuments.mockResolvedValueOnce(11);
    myCashbackModel.countDocuments.mockResolvedValueOnce(7);

    await expect(service.getStats()).resolves.toEqual({
      gogocashUsers: 11,
      mycashbackUsers: 7,
    });
  });

  it('returns the flat summary shape consumed by Admin', async () => {
    conversionModel.aggregate.mockResolvedValueOnce([
      { count: 3, totalPayout: 45.5, totalSaleAmount: 500 },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([
      {
        _id: 'pending',
        count: 2,
        totalAmount: 300,
        oldestAt: new Date('2026-07-15T08:00:00.000Z'),
      },
      { _id: 'completed', count: 1, totalAmount: 200 },
      { _id: 'rejected', count: 1, totalAmount: 50 },
    ]);

    await expect(service.getSummary()).resolves.toEqual({
      currency: 'THB',
      conversionCount: 3,
      conversionTotalPayout: 45.5,
      conversionTotalSaleAmount: 500,
      lastUpdated: '2026-07-18T12:00:00.000Z',
      withdrawByStatus: {
        pending: {
          count: 2,
          total: 300,
          oldestAt: '2026-07-15T08:00:00.000Z',
        },
        approved: { count: 1, total: 200 },
        rejected: { count: 1, total: 0 },
      },
    });

    expect(conversionModel.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          quest_synthetic_reward: { $ne: true },
          offer_name: { $ne: 'reward_conversion_quest' },
        },
      },
      expect.any(Object),
    ]);
    expect(withdrawModel.aggregate).toHaveBeenCalledWith([
      { $match: { currency: 'THB' } },
      expect.objectContaining({
        $group: expect.objectContaining({
          _id: { $toLower: { $ifNull: ['$status', 'unknown'] } },
        }),
      }),
    ]);
  });

  it('returns the complete insights shape with real core aggregates', async () => {
    userModel.countDocuments
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(2);
    myCashbackModel.countDocuments
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(6);
    conversionModel.aggregate.mockResolvedValueOnce([
      {
        currentTotals: [{ count: 2, totalPayout: 30, totalSaleAmount: 300 }],
        priorTotals: [{ count: 1, totalPayout: 10, totalSaleAmount: 100 }],
        byStatus: [
          { _id: 'approved', count: 1 },
          { _id: 'pending', count: 1 },
        ],
        topOffers: [
          {
            _id: {
              offerId: 101,
              networkId: 'involve',
              providerAccount: 'default',
            },
            latest: {
              offerName: 'Example Store',
              merchantId: 501,
            },
            conversions: 2,
            gmv: 300,
            payout: 30,
          },
        ],
        networkBreakdown: [
          {
            _id: 'involve',
            offerIds: [101],
            conversions: 2,
            gmv: 300,
            payout: 30,
          },
        ],
        timeSeries: [
          {
            _id: '2026-07-17',
            count: 2,
            totalPayout: 30,
            totalSaleAmount: 300,
          },
        ],
      },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([
      {
        _id: 'pending',
        count: 2,
        totalAmount: 300,
        oldestAt: new Date('2026-07-15T08:00:00.000Z'),
      },
      { _id: 'approved', count: 3, totalAmount: 400 },
      { _id: 'rejected', count: 1, totalAmount: 50 },
    ]);
    withdrawModel.countDocuments.mockResolvedValueOnce(1);

    const result = await service.getInsights('30d');

    expect(result).toMatchObject({
      lastUpdated: '2026-07-18T12:00:00.000Z',
      range: '30d',
      currency: 'THB',
      availability: {
        clicks: { available: false, reason: expect.any(String) },
        commissionHealth: { available: false, reason: expect.any(String) },
        quests: { available: false, reason: expect.any(String) },
      },
      kpis: {
        current: {
          gogocashUsers: 11,
          mycashbackUsers: 7,
          conversionCount: 2,
          conversionTotalPayout: 30,
          conversionTotalSaleAmount: 300,
        },
        prior: {
          gogocashUsers: 9,
          mycashbackUsers: 6,
          conversionCount: 1,
          conversionTotalPayout: 10,
          conversionTotalSaleAmount: 100,
        },
        newUsersInPeriod: 2,
      },
      withdrawByStatus: {
        pending: {
          count: 2,
          total: 300,
          oldestAt: '2026-07-15T08:00:00.000Z',
        },
        approved: { count: 3, total: 400 },
        rejected: { count: 1, total: 0 },
      },
      withdrawMetrics: {
        approvalRatePct: 75,
        pendingOver48hCount: 1,
        rejectedSharePct: 25,
      },
      conversionsByStatus: { approved: 1, pending: 1 },
      payoutRatio: 0.1,
      topOffers: [
        {
          offerId: 101,
          offerName: 'Example Store',
          merchantId: 501,
          networkId: 'involve',
          providerAccount: 'default',
          conversions: 2,
          gmv: 300,
          payout: 30,
          currency: 'THB',
        },
      ],
      networkBreakdown: [
        {
          networkId: 'involve',
          networkName: 'Involve Asia',
          offersCount: 1,
          conversions: 2,
          gmv: 300,
          payout: 30,
          currency: 'THB',
        },
      ],
      commissionHealth: {
        missingAdminCap: 0,
        missingPartnerCap: 0,
        adminOverPartner: 0,
      },
    });
    expect(result.statistics.day).toEqual({
      categories: ['2026-07-17'],
      series: [
        { name: 'Clicks', data: [0] },
        { name: 'Conversions', data: [2] },
        { name: 'Sale Amount', data: [300] },
        { name: 'Estimated Earnings', data: [30] },
      ],
      description: 'Daily conversion activity for the selected 30d range',
    });
    expect(result.quests).toMatchObject({
      totalQuests: 0,
      rows: [],
      timeline: [],
      leaderboardPreview: null,
    });

    expect(Object.keys(result).sort()).toEqual(
      [
        'alerts',
        'availability',
        'commissionHealth',
        'conversionsByStatus',
        'currency',
        'insightSummary',
        'kpis',
        'lastUpdated',
        'networkBreakdown',
        'payoutRatio',
        'period',
        'quests',
        'range',
        'statistics',
        'topOffers',
        'withdrawByStatus',
        'withdrawMetrics',
      ].sort(),
    );
  });

  it('uses an indexed commercial scope before the facet and keeps all-currency counts while restricting THB money to eligible statuses', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([
      {
        currentTotals: [{ count: 2, totalPayout: 25, totalSaleAmount: 250 }],
        priorTotals: [],
        byStatus: [{ _id: 'rejected', count: 1 }],
      },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('30d');
    const pipeline = conversionModel.aggregate.mock.calls[0][0];
    const expectedPriorFrom = new Date('2026-05-19T12:00:00.000Z');

    expect(pipeline[0]).toEqual({
      $match: {
        quest_synthetic_reward: { $ne: true },
        offer_name: { $ne: 'reward_conversion_quest' },
        datetime_conversion: {
          $gte: expectedPriorFrom,
          $lte: new Date('2026-07-18T12:00:00.000Z'),
        },
      },
    });
    expect(pipeline[1]).toHaveProperty('$project');
    expect(pipeline[1].$project).not.toHaveProperty('raw');
    expect(pipeline[2]).toHaveProperty('$facet');

    const facet = pipeline[2].$facet;
    expect(facet.currentTotals[0]).toEqual({
      $match: {
        datetime_conversion: {
          $gte: new Date('2026-06-18T12:00:00.000Z'),
          $lte: new Date('2026-07-18T12:00:00.000Z'),
        },
      },
    });
    expect(facet.currentTotals[1].$group.count).toEqual({ $sum: 1 });
    const moneyExpression = JSON.stringify(
      facet.currentTotals[1].$group.totalPayout,
    );
    expect(moneyExpression).toContain('currency');
    expect(moneyExpression).toContain('THB');
    expect(moneyExpression).toContain('approved');
    expect(moneyExpression).toContain('pending');
    expect(moneyExpression).toContain('paid');
    expect(moneyExpression).not.toContain('reversed');
    expect(result.conversionsByStatus).toEqual({ rejected: 1 });
    expect(result.kpis.current).toMatchObject({
      conversionCount: 2,
      conversionTotalPayout: 25,
      conversionTotalSaleAmount: 250,
    });

    const topOfferGroup = facet.topOffers.find(
      (stage: Record<string, unknown>) => '$group' in stage,
    ).$group;
    expect(topOfferGroup._id).toEqual({
      networkId: expect.any(Object),
      providerAccount: expect.any(Object),
      offerId: '$offer_id',
    });
    expect(topOfferGroup.latest).toHaveProperty('$top');
    expect(topOfferGroup).not.toHaveProperty('offerName');
    expect(facet.timeSeries[1].$group._id.$dateToString.timezone).toBe(
      '+07:00',
    );
    expect(withdrawModel.countDocuments).toHaveBeenCalledWith({
      currency: 'THB',
      status: 'pending',
      createdAt: { $lt: new Date('2026-07-16T12:00:00.000Z') },
    });
  });

  it('keeps mixed-currency commercial counts while summing only eligible THB money', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([
      {
        currentTotals: [{ count: 4, totalPayout: 30, totalSaleAmount: 300 }],
        byStatus: [
          { _id: 'approved', count: 2 },
          { _id: 'pending', count: 1 },
          { _id: 'reversed', count: 1 },
        ],
        timeSeries: [
          {
            _id: '2026-07-18',
            count: 4,
            totalPayout: 30,
            totalSaleAmount: 300,
          },
        ],
      },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('7d');
    const pipeline = conversionModel.aggregate.mock.calls[0][0];

    expect(pipeline[0].$match).not.toHaveProperty('currency');
    expect(result.kpis.current).toMatchObject({
      conversionCount: 4,
      conversionTotalPayout: 30,
      conversionTotalSaleAmount: 300,
    });
    expect(result.conversionsByStatus).toEqual({
      approved: 2,
      pending: 1,
      reversed: 1,
    });
    expect(result.statistics.day.series[1].data).toEqual([4]);
    expect(result.statistics.day.series[2].data).toEqual([300]);
    const amountExpression = JSON.stringify(
      pipeline[2].$facet.currentTotals[1].$group.totalPayout,
    );
    expect(amountExpression).toContain('THB');
    expect(amountExpression).not.toContain('reversed');
  });

  it('namespaces top offers by network and provider account without a global facet sort', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([
      {
        topOffers: [
          {
            _id: {
              networkId: 'involve',
              providerAccount: 'default',
              offerId: 7,
            },
            latest: { offerName: 'Involve Seven', merchantId: 17 },
            conversions: 3,
            gmv: 100,
            payout: 10,
          },
          {
            _id: {
              networkId: 'optimise',
              providerAccount: 'publisher-th',
              offerId: 7,
            },
            latest: { offerName: 'Optimise Seven', merchantId: 27 },
            conversions: 2,
            gmv: 200,
            payout: 20,
          },
        ],
      },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('all');
    const topOfferStages =
      conversionModel.aggregate.mock.calls[0][0][2].$facet.topOffers;

    expect(topOfferStages[1]).toHaveProperty('$group');
    expect(topOfferStages[1].$group.latest).toHaveProperty('$top');
    expect(topOfferStages.slice(0, 2)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $sort: expect.anything() }),
      ]),
    );
    expect(result.topOffers).toEqual([
      expect.objectContaining({
        networkId: 'involve',
        providerAccount: 'default',
        offerId: 7,
        offerName: 'Involve Seven',
      }),
      expect.objectContaining({
        networkId: 'optimise',
        providerAccount: 'publisher-th',
        offerId: 7,
        offerName: 'Optimise Seven',
      }),
    ]);
  });

  it('excludes both flagged and legacy-signature quest rewards and reports unknown statuses', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([
      {
        byStatus: [
          { _id: 'approved', count: 1 },
          { _id: 'provider_mystery', count: 2 },
        ],
      },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([
      { _id: 'pending', count: 1, totalAmount: 25 },
      { _id: 'provider_mystery', count: 3, totalAmount: 500 },
    ]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('30d');
    const scope = conversionModel.aggregate.mock.calls[0][0][0].$match;

    expect(scope).toMatchObject({
      quest_synthetic_reward: { $ne: true },
      offer_name: { $ne: 'reward_conversion_quest' },
    });
    expect(result.withdrawByStatus.pending).toMatchObject({
      count: 1,
      total: 25,
    });
    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'conversion-status-unknown',
          body: expect.stringContaining('2'),
        }),
        expect.objectContaining({
          id: 'withdraw-status-unknown',
          body: expect.stringContaining('3'),
        }),
      ]),
    );
  });

  it('counts current and prior users as of each window end, including MyCashback', async () => {
    userModel.countDocuments
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3);
    myCashbackModel.countDocuments
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(5);
    conversionModel.aggregate.mockResolvedValueOnce([{}]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('7d');

    expect(userModel.countDocuments).toHaveBeenNthCalledWith(1, {
      createdAt: { $lte: new Date('2026-07-18T12:00:00.000Z') },
    });
    expect(userModel.countDocuments).toHaveBeenNthCalledWith(2, {
      createdAt: { $lte: new Date('2026-07-11T11:59:59.999Z') },
    });
    expect(userModel.countDocuments).toHaveBeenNthCalledWith(3, {
      createdAt: {
        $gte: new Date('2026-07-11T12:00:00.000Z'),
        $lte: new Date('2026-07-18T12:00:00.000Z'),
      },
    });
    expect(myCashbackModel.countDocuments).toHaveBeenNthCalledWith(1, {
      createdAt: { $lte: new Date('2026-07-18T12:00:00.000Z') },
    });
    expect(myCashbackModel.countDocuments).toHaveBeenNthCalledWith(2, {
      createdAt: { $lte: new Date('2026-07-11T11:59:59.999Z') },
    });
    expect(result.kpis.current).toMatchObject({
      gogocashUsers: 11,
      mycashbackUsers: 7,
    });
    expect(result.kpis.prior).toMatchObject({
      gogocashUsers: 8,
      mycashbackUsers: 5,
    });
  });

  it('interprets custom dates as exact Asia/Bangkok calendar-day instants', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([{}]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('custom:2026-07-01:2026-07-18');
    const pipeline = conversionModel.aggregate.mock.calls[0][0];

    expect(result.period).toEqual({
      from: '2026-06-30T17:00:00.000Z',
      to: '2026-07-18T16:59:59.999Z',
    });
    expect(pipeline[0].$match.datetime_conversion).toEqual({
      $gte: new Date('2026-06-12T17:00:00.000Z'),
      $lte: new Date('2026-07-18T16:59:59.999Z'),
    });
    expect(userModel.countDocuments).toHaveBeenNthCalledWith(2, {
      createdAt: { $lte: new Date('2026-06-30T16:59:59.999Z') },
    });
  });

  it('builds distinct day, week, month, quarter, and year buckets from daily rows', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([
      {
        timeSeries: [
          {
            _id: '2025-12-31',
            count: 1,
            totalPayout: 10,
            totalSaleAmount: 100,
          },
          {
            _id: '2026-01-01',
            count: 2,
            totalPayout: 20,
            totalSaleAmount: 200,
          },
          {
            _id: '2026-01-05',
            count: 3,
            totalPayout: 30,
            totalSaleAmount: 300,
          },
          {
            _id: '2026-04-01',
            count: 4,
            totalPayout: 40,
            totalSaleAmount: 400,
          },
          {
            _id: '2027-01-01',
            count: 5,
            totalPayout: 50,
            totalSaleAmount: 500,
          },
        ],
      },
    ]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const { statistics } = await service.getInsights('all');

    expect(statistics.day.categories).toEqual([
      '2025-12-31',
      '2026-01-01',
      '2026-01-05',
      '2026-04-01',
      '2027-01-01',
    ]);
    expect(statistics.week.categories).toEqual([
      '2025-12-29',
      '2026-01-05',
      '2026-03-30',
      '2026-12-28',
    ]);
    expect(statistics.week.series[1].data).toEqual([3, 3, 4, 5]);
    expect(statistics.month.categories).toEqual([
      '2025-12',
      '2026-01',
      '2026-04',
      '2027-01',
    ]);
    expect(statistics.quarter.categories).toEqual([
      '2025-Q4',
      '2026-Q1',
      '2026-Q2',
      '2027-Q1',
    ]);
    expect(statistics.year.categories).toEqual(['2025', '2026', '2027']);
    expect(statistics.year.series[2].data).toEqual([100, 900, 500]);
  });

  it('returns null prior user and conversion KPIs for all range', async () => {
    userModel.countDocuments
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(11);
    myCashbackModel.countDocuments.mockResolvedValueOnce(7);
    conversionModel.aggregate.mockResolvedValueOnce([{}]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('all');

    expect(result.kpis.prior).toBeNull();
    expect(userModel.countDocuments).toHaveBeenCalledTimes(2);
    expect(myCashbackModel.countDocuments).toHaveBeenCalledTimes(1);
  });

  it('uses deterministic zero and empty values when collections have no rows', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    myCashbackModel.countDocuments.mockResolvedValue(0);
    conversionModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.aggregate.mockResolvedValueOnce([]);
    withdrawModel.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getInsights('unexpected');

    expect(result.range).toBe('30d');
    expect(result.kpis.current).toEqual({
      gogocashUsers: 0,
      mycashbackUsers: 0,
      conversionCount: 0,
      conversionTotalPayout: 0,
      conversionTotalSaleAmount: 0,
    });
    expect(result.withdrawByStatus).toEqual({
      pending: { count: 0, total: 0, oldestAt: null },
      approved: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 },
    });
    expect(result.conversionsByStatus).toEqual({});
    expect(result.topOffers).toEqual([]);
    expect(result.networkBreakdown).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.statistics.month.categories).toEqual([]);
    expect(result.quests.rows).toEqual([]);
  });
});
