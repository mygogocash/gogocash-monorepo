import { HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { PointService } from 'src/point/point.service';
import { legacyQuestPayoutConfigChecksum } from './legacy-reward-manifest';

function serviceHarness() {
  const questId = new Types.ObjectId();
  const userId = new Types.ObjectId().toHexString();
  const socialId = new Types.ObjectId();
  const quest = {
    _id: questId,
    reward_model: 'legacy_v1',
    legacy_payout_reconciliation_status: 'ready',
    legacy_payout_reconciliation_version: 1,
    facebook_page: 'https://facebook.example/gogocash',
    facebook_post: 'https://facebook.example/gogocash/posts/immutable',
    line: 'https://line.example/gogocash',
    legacy_payout_config_checksum: '',
  };
  quest.legacy_payout_config_checksum = legacyQuestPayoutConfigChecksum(quest);
  const social = {
    _id: socialId,
    quest_id: questId,
    user_id: new Types.ObjectId(userId),
    type: 'facebook',
    action: 'follow',
    reward_status: false,
    legacy_payout_key: `legacy:quest:${questId}:social:facebook:follow:user:${userId}`,
  };
  const questModel = {
    findOne: jest.fn().mockReturnValue(
      (() => {
        const query = {
          sort: jest.fn(),
          lean: jest.fn().mockResolvedValue(quest),
        };
        query.sort.mockReturnValue(query);
        return query;
      })(),
    ),
  };
  const socialRewardModel = {
    findOne: jest.fn().mockResolvedValue(social),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOneAndUpdate: jest.fn().mockResolvedValue({
      ...social,
      toObject: () => social,
    }),
  };
  const service = Object.create(PointService.prototype) as any;
  service.questModel = questModel;
  service.socialRewardModel = socialRewardModel;
  service.addPointsToUser = jest.fn().mockResolvedValue({}) as never;
  return {
    service: service as PointService,
    questModel,
    socialRewardModel,
    quest,
    social,
    userId,
  };
}

describe('PointService legacy social writer', () => {
  it('atomically creates one quest/user/type/action identity and excludes task_v2 at query time', async () => {
    const { service, questModel, socialRewardModel, userId, social } =
      serviceHarness();

    await Promise.all([
      service.questSocial(userId, 'facebook', 'follow'),
      service.questSocial(userId, 'facebook', 'follow'),
    ]);

    const questQuery = questModel.findOne.mock.calls[0][0];
    expect(questQuery.legacy_payout_reconciliation_status).toBe('ready');
    expect(questQuery.legacy_payout_reconciliation_version).toBe(1);
    expect(JSON.stringify(questQuery)).toContain('legacy_v1');
    expect(JSON.stringify(questQuery)).not.toContain('task_v2');
    expect(socialRewardModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
    for (const call of socialRewardModel.findOneAndUpdate.mock.calls) {
      expect(call).toEqual([
        { legacy_payout_key: social.legacy_payout_key },
        {
          $setOnInsert: expect.objectContaining({
            legacy_payout_key: social.legacy_payout_key,
            reward_status: false,
          }),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ]);
    }
  });

  it('writes the Point by the durable social identity before CAS-completing the SocialReward', async () => {
    const { service, socialRewardModel, userId, social } = serviceHarness();

    await service.updateQuestSocial(userId, social._id.toHexString());

    expect(service.addPointsToUser).toHaveBeenCalledWith(
      userId,
      50,
      0,
      `reward_quest_social:facebook:follow:${social._id}`,
      social.legacy_payout_key,
    );
    expect(socialRewardModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: social._id,
        user_id: new Types.ObjectId(userId),
        legacy_payout_key: social.legacy_payout_key,
        reward_status: false,
      },
      {
        $set: {
          reward_status: true,
        },
      },
      { new: true },
    );
  });

  it.each([
    ['facebook', 'share'],
    ['facebook', 'attacker_action_1'],
    ['telegram', 'follow'],
    ['line', 'attacker_action_2'],
  ])(
    'rejects attacker-controlled pair %s/%s before creating a claim',
    async (type, action) => {
      const { service, socialRewardModel, userId } = serviceHarness();

      await expect(service.questSocial(userId, type, action)).rejects.toEqual(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST }),
      );
      expect(socialRewardModel.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('enforces the immutable per-user campaign cap before awarding another pair', async () => {
    const { service, socialRewardModel, userId, social } = serviceHarness();
    socialRewardModel.findOne.mockResolvedValue({
      ...social,
      type: 'line',
      action: 'add_friend',
      legacy_payout_key: social.legacy_payout_key.replace(
        'facebook:follow',
        'line:add_friend',
      ),
    });
    socialRewardModel.countDocuments.mockResolvedValue(5);

    await expect(
      service.updateQuestSocial(userId, social._id.toHexString()),
    ).rejects.toEqual(expect.objectContaining({ status: HttpStatus.CONFLICT }));
    expect(service.addPointsToUser).not.toHaveBeenCalled();
  });

  it('leaves the claim incomplete after a Point failure and retry reuses exactly the same key', async () => {
    const { service, socialRewardModel, userId, social } = serviceHarness();
    (service.addPointsToUser as jest.Mock)
      .mockRejectedValueOnce(new Error('point write failed'))
      .mockResolvedValueOnce({});

    await expect(
      service.updateQuestSocial(userId, social._id.toHexString()),
    ).rejects.toThrow('point write failed');
    expect(socialRewardModel.findOneAndUpdate).not.toHaveBeenCalled();
    await service.updateQuestSocial(userId, social._id.toHexString());

    expect((service.addPointsToUser as jest.Mock).mock.calls[0][4]).toBe(
      (service.addPointsToUser as jest.Mock).mock.calls[1][4],
    );
    expect(socialRewardModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('awards nothing when the quest is missing, quarantined, or task_v2', async () => {
    const { service, questModel, socialRewardModel, userId, social } =
      serviceHarness();
    questModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.updateQuestSocial(userId, social._id.toHexString()),
    ).rejects.toEqual(
      new HttpException(
        'Legacy quest rewards are not reconciled',
        HttpStatus.CONFLICT,
      ),
    );
    expect(service.addPointsToUser).not.toHaveBeenCalled();
    expect(socialRewardModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
