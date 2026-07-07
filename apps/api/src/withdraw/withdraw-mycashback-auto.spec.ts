import { Types } from 'mongoose';

import {
  buildAutoMyCashbackWithdrawFields,
  resolveAutoMyCashbackWithdrawAmount,
  resolveAutoMyCashbackWithdrawIds,
} from './withdraw-mycashback-auto';

describe('withdraw-mycashback-auto', () => {
  const MCB_ID_A = new Types.ObjectId().toString();
  const MCB_ID_B = new Types.ObjectId().toString();

  describe('resolveAutoMyCashbackWithdrawAmount', () => {
    it('given missing amount_total > then uses the full available MCB balance', () => {
      expect(
        resolveAutoMyCashbackWithdrawAmount('USD', undefined, {
          availableTHB: 0,
          availableUSD: 30,
        }),
      ).toBe(30);
    });

    it('given amount_total above available > then caps at available balance', () => {
      expect(
        resolveAutoMyCashbackWithdrawAmount('USD', 100, {
          availableTHB: 0,
          availableUSD: 30,
        }),
      ).toBe(30);
    });

    it('given zero available balance > then returns 0', () => {
      expect(
        resolveAutoMyCashbackWithdrawAmount('USD', undefined, {
          availableTHB: 0,
          availableUSD: 0,
        }),
      ).toBe(0);
    });
  });

  describe('resolveAutoMyCashbackWithdrawIds', () => {
    it('maps server-known MyCashback ids to ObjectIds', () => {
      expect(
        resolveAutoMyCashbackWithdrawIds({
          conversionIdMyCashback: [MCB_ID_A, MCB_ID_B],
        }).map(String),
      ).toEqual([MCB_ID_A, MCB_ID_B]);
    });

    it('returns an empty array instead of leaving mycashback_id unset', () => {
      expect(
        resolveAutoMyCashbackWithdrawIds({ conversionIdMyCashback: [] }),
      ).toEqual([]);
    });
  });

  describe('buildAutoMyCashbackWithdrawFields', () => {
    it('given client omits mycashback_id > then tags the auto withdrawal with server ids', () => {
      const userId = new Types.ObjectId();
      const fields = buildAutoMyCashbackWithdrawFields(
        {
          currency: 'USDT',
        },
        userId,
        {
          availableTHB: 0,
          availableUSD: 30,
          conversionIdMyCashback: [MCB_ID_A],
        },
      );

      expect(fields).toMatchObject({
        amount_net: 30,
        amount_total: 30,
        currency: 'USDT',
      });
      expect(fields?.mycashback_id.map(String)).toEqual([MCB_ID_A]);
      expect(fields?.mycashback_id).not.toBeUndefined();
    });
  });
});
