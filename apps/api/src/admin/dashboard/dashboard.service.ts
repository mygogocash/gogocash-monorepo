import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Withdraw.name)
    private readonly withdrawModel: Model<Withdraw>,
  ) {}

  /** Aggregate user counts for the admin dashboard home page. */
  async getStats() {
    const [totalUsers, totalConversions, totalWithdraws, countryBreakdown] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.conversionModel.countDocuments(),
        this.withdrawModel.countDocuments(),
        this.userModel.aggregate([
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast30d = await this.userModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    return {
      totalUsers,
      newUsersLast30d,
      totalConversions,
      totalWithdraws,
      countryBreakdown: countryBreakdown.map((c) => ({
        country: c._id || 'Unknown',
        count: c.count,
      })),
    };
  }

  /** Conversion + withdrawal aggregate totals for management summary. */
  async getSummary() {
    const [conversionSummary, withdrawSummary] = await Promise.all([
      this.conversionModel.aggregate([
        {
          $group: {
            _id: '$conversion_status',
            count: { $sum: 1 },
            totalPayout: { $sum: { $toDouble: '$payout' } },
          },
        },
      ]),
      this.withdrawModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: '$amount' } },
          },
        },
      ]),
    ]);

    const conversionsByStatus: Record<
      string,
      { count: number; totalPayout: number }
    > = {};
    for (const c of conversionSummary) {
      conversionsByStatus[c._id || 'unknown'] = {
        count: c.count,
        totalPayout: c.totalPayout,
      };
    }

    const withdrawsByStatus: Record<
      string,
      { count: number; totalAmount: number }
    > = {};
    for (const w of withdrawSummary) {
      withdrawsByStatus[w._id || 'unknown'] = {
        count: w.count,
        totalAmount: w.totalAmount,
      };
    }

    return { conversions: conversionsByStatus, withdrawals: withdrawsByStatus };
  }

  /** Time-series analytics for the dashboard chart. */
  async getInsights(range = '30d') {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [conversionTimeSeries, withdrawTimeSeries, newUserTimeSeries] =
      await Promise.all([
        this.conversionModel.aggregate([
          {
            $match: {
              datetime_conversion: { $gte: since.toISOString() },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: { $toDate: '$datetime_conversion' },
                },
              },
              count: { $sum: 1 },
              totalPayout: { $sum: { $toDouble: '$payout' } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        this.withdrawModel.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
              count: { $sum: 1 },
              totalAmount: { $sum: { $toDouble: '$amount' } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        this.userModel.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return {
      range,
      conversions: conversionTimeSeries.map((d) => ({
        date: d._id,
        count: d.count,
        totalPayout: d.totalPayout,
      })),
      withdrawals: withdrawTimeSeries.map((d) => ({
        date: d._id,
        count: d.count,
        totalAmount: d.totalAmount,
      })),
      newUsers: newUserTimeSeries.map((d) => ({
        date: d._id,
        count: d.count,
      })),
    };
  }
}
