import { Types } from 'mongoose';
import * as helper from 'src/utils/helper';
import { WithdrawService } from './withdraw.service';

jest.mock('src/utils/helper', () => ({
  ...jest.requireActual('src/utils/helper'),
  rateCurrencyUSD: jest.fn(),
}));

// Focused unit harness: the default scaffold spec cannot compile the full DI
// graph (pre-existing), so the method under test gets exactly the model seams
// it touches. Reproduces the live staging 500: a fresh phone-OTP user has
// NEITHER mobile NOR email on the user doc, and the MyCashback email lookup
// ran `email: { $regex: undefined }`, which MongoDB rejects.
function buildService({
  user,
  myCashbackFind,
  userFindOne,
  withdrawFind,
}: {
  user: Record<string, unknown>;
  myCashbackFind: jest.Mock;
  userFindOne?: jest.Mock;
  withdrawFind?: jest.Mock;
}): WithdrawService {
  const service = Object.create(WithdrawService.prototype) as WithdrawService;
  (service as unknown as Record<string, unknown>).userModel = {
    findOne: userFindOne ?? jest.fn().mockResolvedValue(user),
  };
  (service as unknown as Record<string, unknown>).userMyCashbackModel = {
    find: myCashbackFind,
  };
  (service as unknown as Record<string, unknown>).withdrawModel = {
    find:
      withdrawFind ??
      jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      })),
  };
  return service;
}

describe('WithdrawService.checkWithdrawMyCashback', () => {
  const userId = new Types.ObjectId().toString();

  it('given a fresh phone-OTP user with neither mobile nor email > then returns zeroed totals without an undefined-email query', async () => {
    const myCashbackFind = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([]),
    }));
    const service = buildService({
      user: { _id: new Types.ObjectId(userId), provider: 'phone' },
      myCashbackFind,
    });

    const result = await service.checkWithdrawMyCashback(userId);

    expect(result).toEqual({
      totalMyCashbackTHB: 0,
      totalMyCashbackUSD: 0,
      availableUSD: 0,
      availableTHB: 0,
      conversionIdMyCashback: [],
    });
    // The defect: this was called with { email: { $regex: undefined } }.
    expect(myCashbackFind).not.toHaveBeenCalled();
  });

  it('given a user with an email > then the email lookup still runs', async () => {
    const myCashbackFind = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([]),
    }));
    const service = buildService({
      user: {
        _id: new Types.ObjectId(userId),
        email: 'user@example.com',
        provider: 'google.com',
      },
      myCashbackFind,
    });

    await service.checkWithdrawMyCashback(userId);

    expect(myCashbackFind).toHaveBeenCalledWith({
      email: { $regex: '^user@example\\.com$', $options: 'i' },
    });
  });

  it('given an email with regex metacharacters > then escapes and anchors the lookup', async () => {
    const myCashbackFind = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([]),
    }));
    const service = buildService({
      user: {
        _id: new Types.ObjectId(userId),
        email: 'a+b@x.com',
        provider: 'google.com',
      },
      myCashbackFind,
    });

    await service.checkWithdrawMyCashback(userId);

    expect(myCashbackFind).toHaveBeenCalledWith({
      email: { $regex: '^a\\+b@x\\.com$', $options: 'i' },
    });
  });

  it('given an already-loaded user doc > then skips userModel.findOne', async () => {
    const userFindOne = jest.fn();
    const myCashbackFind = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([]),
    }));
    const loadedUser = {
      _id: new Types.ObjectId(userId),
      email: 'user@example.com',
      provider: 'google.com',
    };
    const service = buildService({
      user: loadedUser,
      myCashbackFind,
      userFindOne,
    });

    await service.checkWithdrawMyCashback(userId, loadedUser as never);

    expect(userFindOne).not.toHaveBeenCalled();
  });

  it('given mixed USD and THB balances > then totalMyCashbackUSD sums per-currency conversions', async () => {
    const rateCurrencyUSD = helper.rateCurrencyUSD as jest.Mock;
    rateCurrencyUSD.mockResolvedValue({ THB: 35 });

    const cashbackId = new Types.ObjectId();
    const myCashbackFind = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([
        {
          _id: cashbackId,
          balance: [{ amount: 10, currency: 'USD' }],
        },
        {
          _id: new Types.ObjectId(),
          balance: [{ amount: 700, currency: 'THB' }],
        },
      ]),
    }));
    const service = buildService({
      user: {
        _id: new Types.ObjectId(userId),
        email: 'user@example.com',
        provider: 'google.com',
      },
      myCashbackFind,
    });

    const result = await service.checkWithdrawMyCashback(userId);

    expect(result.totalMyCashbackUSD).toBeCloseTo(30, 5);
    expect(result.totalMyCashbackTHB).toBeCloseTo(1050, 5);
    expect(result.availableUSD).toBeCloseTo(30, 5);
    expect(result.availableTHB).toBeCloseTo(1050, 5);
  });
});
