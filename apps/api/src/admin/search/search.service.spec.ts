import { SearchService } from './search.service';

const OFFER_ID = '507f1f77bcf86cd799439011';
const RULE_ID = '507f1f77bcf86cd799439012';
const BLOCKED_RULE_ID = '507f1f77bcf86cd799439013';

describe('SearchService persistent rules', () => {
  const featuredModel = {};
  const blacklistModel = {};
  const boostModel = {
    create: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };
  const offerModel = {
    find: jest.fn(),
  };

  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(
      featuredModel as never,
      boostModel as never,
      blacklistModel as never,
      offerModel as never,
    );
  });

  it('normalizes and persists a DTO-aligned rule', async () => {
    boostModel.create.mockImplementation(async (value) => ({
      _id: RULE_ID,
      ...value,
    }));

    await service.createRule({
      offer_id: OFFER_ID,
      treatment: 'boost',
      keywords: ['  Travel ', 'travel', '', 'HOTEL'],
      weight: 7,
      is_active: true,
    });

    expect(boostModel.create).toHaveBeenCalledWith({
      offer_id: OFFER_ID,
      treatment: 'boost',
      keywords: ['travel', 'hotel'],
      weight: 7,
      boost_weight: 7,
      is_active: true,
    });
  });

  it('hydrates persisted and legacy boost rows with offer labels', async () => {
    const leanRules = jest.fn().mockResolvedValue([
      {
        _id: RULE_ID,
        offer_id: OFFER_ID,
        boost_weight: 5,
        is_active: true,
        createdAt: new Date('2026-07-15T00:00:00.000Z'),
        updatedAt: new Date('2026-07-15T01:00:00.000Z'),
      },
      {
        _id: BLOCKED_RULE_ID,
        offer_id: OFFER_ID,
        treatment: 'blocked',
        keywords: [' FRAUD '],
        boost_weight: 1,
        is_active: true,
      },
      {
        _id: 'legacy-rule',
        offer_id: 'legacy-non-object-id',
        boost_weight: 3,
        is_active: true,
      },
    ]);
    boostModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: leanRules }),
    });
    offerModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: OFFER_ID,
            offer_name: 'Klook Travel - CPS',
            offer_name_display: 'Klook Travel',
          },
        ]),
      }),
    });

    const result = await service.getRules();

    expect(result.data).toEqual([
      expect.objectContaining({
        id: RULE_ID,
        offer_id: OFFER_ID,
        offer_name: 'Klook Travel',
        treatment: 'boost',
        keywords: [],
        weight: 5,
        is_active: true,
      }),
      expect.objectContaining({
        id: BLOCKED_RULE_ID,
        treatment: 'blocked',
        keywords: ['fraud'],
        weight: undefined,
      }),
      expect.objectContaining({
        id: 'legacy-rule',
        offer_id: 'legacy-non-object-id',
        treatment: 'boost',
        weight: 3,
      }),
    ]);
    expect(offerModel.find).toHaveBeenCalledWith({
      _id: { $in: [OFFER_ID] },
    });
  });

  it('updates only supplied fields and normalizes keyword edits', async () => {
    boostModel.findByIdAndUpdate.mockResolvedValue({ _id: RULE_ID });

    await service.updateRule(RULE_ID, {
      treatment: 'blocked',
      keywords: ['  SCAM ', 'scam', 'Fraud'],
      is_active: false,
    });

    expect(boostModel.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      {
        $set: {
          treatment: 'blocked',
          keywords: ['scam', 'fraud'],
          is_active: false,
        },
      },
      { new: true },
    );
  });

  it('deletes the persisted rule by validated id', async () => {
    boostModel.findByIdAndDelete.mockResolvedValue({ _id: RULE_ID });

    await expect(service.deleteRule(RULE_ID)).resolves.toEqual({
      success: true,
    });
    expect(boostModel.findByIdAndDelete).toHaveBeenCalledWith(
      expect.anything(),
    );
  });
});
