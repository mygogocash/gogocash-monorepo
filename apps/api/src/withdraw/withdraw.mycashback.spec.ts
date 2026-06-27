import { Types } from 'mongoose';
import { WithdrawService } from './withdraw.service';

// Focused unit harness: the default scaffold spec cannot compile the full DI
// graph (pre-existing), so the method under test gets exactly the model seams
// it touches. Reproduces the live staging 500: a fresh phone-OTP user has
// NEITHER mobile NOR email on the user doc, and the MyCashback email lookup
// ran `email: { $regex: undefined }`, which MongoDB rejects.
function buildService({
  user,
  myCashbackFind,
  userFindOne,
}: {
  user: Record<string, unknown>;
  myCashbackFind: jest.Mock;
  userFindOne?: jest.Mock;
}): WithdrawService {
  const service = Object.create(WithdrawService.prototype) as WithdrawService;
  (service as unknown as Record<string, unknown>).userModel = {
    findOne: userFindOne ?? jest.fn().mockResolvedValue(user),
  };
  (service as unknown as Record<string, unknown>).userMyCashbackModel = {
    find: myCashbackFind,
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
      email: { $regex: 'user@example.com' },
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
});
