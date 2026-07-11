import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { PdpaGatherService } from './pdpa-gather.service';

const USER_ID = '507f1f77bcf86cd799439011';

type LeanFn = jest.Mock;

function makeFindLean(result: unknown): {
  find: jest.Mock;
  findOne: jest.Mock;
  lean: LeanFn;
} {
  const lean = jest.fn().mockResolvedValue(result);
  const chain = { lean };
  return {
    find: jest.fn().mockReturnValue(chain),
    findOne: jest.fn().mockReturnValue(chain),
    lean,
  };
}

function makeService() {
  const user = {
    _id: new Types.ObjectId(USER_ID),
    email: 'seeker@example.com',
    username: 'seeker',
    mobile: '+66812345678',
    email_mcb: 'mcb@example.com',
    address: '1 Road',
    birthdate: '1990-01-01',
    gender: 'F',
    country: 'TH',
    id_card: '1234',
    passport: '',
    legal_address: '',
    state: 'Bangkok',
    city: 'Bangkok',
    zip: '10110',
    avatar_url: 'https://cdn.example/a.png',
    id_firebase: 'fb-1',
    id_twitter: '',
    id_telegram: '',
    id_line: '',
    id_crossmint: '',
    consent: { marketing_communications: true },
    wallet_frozen: false,
    credit_score: 10,
    credit_tier: 'none',
    privilege: 'standard',
    referral_code: 'REF',
    // Must never appear in export:
    withdraw_lock_seq: 99,
  };

  const userModel = makeFindLean(user);
  const myCashbackModel = makeFindLean([
    {
      buyerId: 'b1',
      buyerToken: 'SECRET_TOKEN',
      withdrawalPassword: 'SECRET_PW',
      email: 'seeker@example.com',
      phoneNumber: '+66812345678',
      balance: [{ amount: 10, currency: 'THB' }],
    },
  ]);
  const withdrawMethodModel = makeFindLean([
    { account_no: '001', user_id: USER_ID },
  ]);
  const withdrawModel = makeFindLean([{ amount: 5, user_id: USER_ID }]);
  const favoriteOfferModel = makeFindLean([
    { offer_id: 'o1', user_id: USER_ID },
  ]);
  const missionOrderModel = makeFindLean([
    { orderId: 'ord-1', user_id: USER_ID },
  ]);
  const pointModel = makeFindLean([{ point: 1, user_id: USER_ID }]);
  const socialRewardModel = makeFindLean([
    { quest_id: 'q1', user_id: USER_ID },
  ]);
  const deeplinkModel = makeFindLean([
    { deeplink: 'https://x', user_id: USER_ID },
  ]);
  const gototrackSettingsModel = makeFindLean({
    user_id: USER_ID,
    enabled: true,
  });

  const service = new PdpaGatherService(
    userModel as never,
    myCashbackModel as never,
    withdrawMethodModel as never,
    withdrawModel as never,
    favoriteOfferModel as never,
    missionOrderModel as never,
    pointModel as never,
    socialRewardModel as never,
    deeplinkModel as never,
    gototrackSettingsModel as never,
  );

  return {
    service,
    userModel,
    myCashbackModel,
    withdrawMethodModel,
    withdrawModel,
    favoriteOfferModel,
    missionOrderModel,
    pointModel,
    socialRewardModel,
    deeplinkModel,
    gototrackSettingsModel,
  };
}

describe('PdpaGatherService', () => {
  it('gatherForUser > given a known user > queries each collection by the correct key', async () => {
    const {
      service,
      userModel,
      myCashbackModel,
      withdrawMethodModel,
      withdrawModel,
      favoriteOfferModel,
      missionOrderModel,
      pointModel,
      socialRewardModel,
      deeplinkModel,
      gototrackSettingsModel,
    } = makeService();

    const bundle = await service.gatherForUser(USER_ID);

    expect(userModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(USER_ID),
    });
    expect(myCashbackModel.find).toHaveBeenCalled();
    const mcbQuery = myCashbackModel.find.mock.calls[0][0] as {
      $or: unknown[];
    };
    expect(JSON.stringify(mcbQuery.$or)).toMatch(/seeker@example/);
    expect(JSON.stringify(mcbQuery.$or)).toContain('+66812345678');
    expect(JSON.stringify(mcbQuery.$or)).toMatch(/mcb@example/);

    const oid = new Types.ObjectId(USER_ID);
    expect(withdrawMethodModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(withdrawModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(favoriteOfferModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(missionOrderModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(pointModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(socialRewardModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(deeplinkModel.find).toHaveBeenCalledWith({ user_id: oid });
    expect(gototrackSettingsModel.findOne).toHaveBeenCalledWith({
      user_id: USER_ID,
    });

    expect(bundle.profile.email).toBe('seeker@example.com');
    expect(bundle.profile).not.toHaveProperty('withdraw_lock_seq');
    expect(bundle.myCashbacks[0]).not.toHaveProperty('buyerToken');
    expect(bundle.myCashbacks[0]).not.toHaveProperty('withdrawalPassword');
    expect(bundle.withdrawMethods).toHaveLength(1);
    expect(bundle.withdrawals).toHaveLength(1);
    expect(bundle.favoriteOffers).toHaveLength(1);
    expect(bundle.missionOrders).toHaveLength(1);
    expect(bundle.points).toHaveLength(1);
    expect(bundle.socialRewards).toHaveLength(1);
    expect(bundle.deeplinks).toHaveLength(1);
    expect(bundle.gototrackSettings?.enabled).toBe(true);
    // Quests have no user key — never gathered.
    expect(bundle).not.toHaveProperty('quests');
  });

  it('gatherForUser > given unknown user > throws NotFoundException', async () => {
    const { service, userModel } = makeService();
    userModel.lean.mockResolvedValueOnce(null);

    await expect(service.gatherForUser(USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
