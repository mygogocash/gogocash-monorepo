import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import {
  requireObjectId,
  mongoSetUpdate,
  requireOneOf,
  requireTrimmedString,
} from 'src/common/mongo-query';

export interface UnifiedTransaction {
  _id: string;
  type: 'conversion' | 'withdrawal';
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  offer_name?: string;
  flagged: boolean;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Withdraw.name)
    private readonly withdrawModel: Model<Withdraw>,
  ) {}

  async findAll(query: {
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const queryOnlyConversion = query.type === 'conversion' || !query.type;
    const queryOnlyWithdrawal = query.type === 'withdrawal' || !query.type;

    let conversions: any[] = [];
    let conversionTotal = 0;
    let withdrawals: any[] = [];
    let withdrawalTotal = 0;

    if (queryOnlyConversion) {
      const conversionFilter = this.buildConversionFilter(
        query.search,
        query.status,
      );
      [conversions, conversionTotal] = await Promise.all([
        this.conversionModel
          .find(conversionFilter)
          .sort({ datetime_conversion: -1 })
          .lean()
          .exec(),
        this.conversionModel.countDocuments(conversionFilter).exec(),
      ]);
    }

    if (queryOnlyWithdrawal) {
      const withdrawFilter = this.buildWithdrawFilter(
        query.search,
        query.status,
      );
      [withdrawals, withdrawalTotal] = await Promise.all([
        this.withdrawModel
          .find(withdrawFilter)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.withdrawModel.countDocuments(withdrawFilter).exec(),
      ]);
    }

    const unified = [
      ...conversions.map((c) => this.mapConversion(c)),
      ...withdrawals.map((w) => this.mapWithdrawal(w)),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total =
      query.type === 'conversion'
        ? conversionTotal
        : query.type === 'withdrawal'
          ? withdrawalTotal
          : conversionTotal + withdrawalTotal;

    const paginated = unified.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    const conversion = await this.conversionModel.findById(id).lean().exec();
    if (conversion) {
      return { ...this.mapConversion(conversion), raw: conversion };
    }

    const withdrawal = await this.withdrawModel.findById(id).lean().exec();
    if (withdrawal) {
      return { ...this.mapWithdrawal(withdrawal), raw: withdrawal };
    }

    throw new NotFoundException(`Transaction ${id} not found`);
  }

  async exportCsv(query: {
    search?: string;
    type?: string;
    status?: string;
  }): Promise<string> {
    const result = await this.findAll({
      ...query,
      page: '1',
      limit: '10000',
    });

    const header =
      '_id,type,user_id,amount,currency,status,date,offer_name,flagged';
    const rows = result.data.map((t) =>
      [
        t._id,
        t.type,
        t.user_id,
        t.amount,
        t.currency,
        t.status,
        t.date,
        t.offer_name ?? '',
        t.flagged,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async flagTransaction(
    id: string,
    type: string,
    flagged: boolean,
    reason: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    const objectId = requireObjectId(id);
    const txType = requireOneOf(
      type,
      ['conversion', 'withdrawal'] as const,
      'transaction type',
    );

    const update = mongoSetUpdate({
      flagged,
      flag_reason: requireTrimmedString(reason, 500, 'flag reason'),
    });

    if (txType === 'conversion') {
      const result = await this.conversionModel
        .findByIdAndUpdate(objectId, update, { new: true })
        .lean()
        .exec();
      if (!result) {
        throw new NotFoundException(`Conversion ${id} not found`);
      }
      return this.mapConversion(result);
    }

    if (txType === 'withdrawal') {
      const result = await this.withdrawModel
        .findByIdAndUpdate(objectId, update, { new: true })
        .lean()
        .exec();
      if (!result) {
        throw new NotFoundException(`Withdrawal ${id} not found`);
      }
      return this.mapWithdrawal(result);
    }

    throw new NotFoundException(`Unknown transaction type: ${type}`);
  }

  private buildConversionFilter(
    search?: string,
    status?: string,
  ): Record<string, any> {
    const filter: Record<string, any> = {};

    if (status) {
      filter.conversion_status = status;
    }

    if (search) {
      const safeSearch = escapeRegexLiteral(search);
      filter.$or = [
        { offer_name: { $regex: safeSearch, $options: 'i' } },
        { aff_sub1: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    return filter;
  }

  private buildWithdrawFilter(
    search?: string,
    status?: string,
  ): Record<string, any> {
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const safeSearch = escapeRegexLiteral(search);
      filter.$or = [
        { account_name: { $regex: safeSearch, $options: 'i' } },
        { bank_name: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    return filter;
  }

  private mapConversion(c: any): UnifiedTransaction {
    return {
      _id: c._id?.toString(),
      type: 'conversion',
      user_id: c.user_id?.toString() ?? '',
      amount: c.payout ?? 0,
      currency: c.currency ?? 'THB',
      status: c.conversion_status ?? '',
      date:
        c.datetime_conversion?.toISOString?.() ??
        String(c.datetime_conversion ?? ''),
      offer_name: c.offer_name,
      flagged: c.flagged ?? false,
    };
  }

  private mapWithdrawal(w: any): UnifiedTransaction {
    return {
      _id: w._id?.toString(),
      type: 'withdrawal',
      user_id: w.user_id?.toString() ?? '',
      amount: w.amount_total ?? 0,
      currency: w.currency ?? 'THB',
      status: w.status ?? '',
      date: w.createdAt?.toISOString?.() ?? String(w.createdAt ?? ''),
      flagged: w.flagged ?? false,
    };
  }
}
