import { CreditScoresService } from './credit-scores.service';

const userId = '507f1f77bcf86cd799439011';
const actor = { id: 'admin-1', label: 'ops@gogocash.co' };

const leanQuery = <T>(value: T) => ({
  lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
});

describe('CreditScoresService activity provenance', () => {
  const append = jest.fn().mockResolvedValue(undefined);
  const configModel = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const auditModel = { create: jest.fn() };
  const service = new CreditScoresService(
    userModel as never,
    configModel as never,
    auditModel as never,
    {} as never,
    { append } as never,
  );

  beforeEach(() => {
    append.mockClear();
    jest.clearAllMocks();
  });

  it('logs config changes with the verified actor after persistence', async () => {
    const exec = jest.fn().mockResolvedValue({ max_score: 900 });
    configModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec }),
    });

    await service.updateConfig({ max_score: 900 }, actor);

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'credit_score.config_updated',
      }),
    );
    expect(exec.mock.invocationCallOrder[0]).toBeLessThan(
      append.mock.invocationCallOrder[0],
    );
  });

  it('logs score overrides with both verified actor id and label', async () => {
    userModel.findById.mockReturnValue(
      leanQuery({ credit_score: 10, credit_tier: 'Bronze' }),
    );
    userModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    configModel.findOne.mockReturnValue(
      leanQuery({
        tiers: [{ name: 'Silver', min_score: 11, max_score: 100 }],
        weights: {},
        max_score: 100,
      }),
    );
    auditModel.create.mockResolvedValue({
      toObject: () => ({ new_score: 50 }),
    });

    await service.override(userId, 50, 'manual review', actor);

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'credit_score.overridden',
      }),
    );
  });
});
