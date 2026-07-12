import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { UserMyCashback } from './schemas/user-my-cashback.schema';
import { StoredMediaService } from 'src/media/stored-media.service';

jest.mock('src/auth/firebase-admin.provider', () => ({
  getAdminAuth: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAdminAuth } = require('src/auth/firebase-admin.provider');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Google Play account-deletion policy (launch blocker, 2026-07-11): users who
 * can create an account must be able to delete it. Semantics chosen by the
 * founder: 30-day SOFT delete — the request schedules an anonymizing purge
 * 30 days out, cancellable in the grace window; the purge deletes the
 * Firebase credential and strips PII while financial records stay (Thai
 * PDPA / financial retention).
 */
describe('UserService account deletion', () => {
  let service: UserService;
  let findOneAndUpdate: jest.Mock;
  let find: jest.Mock;
  let updateOne: jest.Mock;
  let deleteFirebaseUser: jest.Mock;

  const userId = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    findOneAndUpdate = jest.fn();
    updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    find = jest.fn();
    deleteFirebaseUser = jest.fn().mockResolvedValue(undefined);
    (getAdminAuth as jest.Mock).mockReturnValue({
      deleteUser: deleteFirebaseUser,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: { findOneAndUpdate, find, updateOne },
        },
        { provide: getModelToken(UserMyCashback.name), useValue: {} },
        {
          provide: StoredMediaService,
          useValue: { replace: jest.fn(), getReadableStream: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('requestAccountDeletion > given a first request > then schedules the anonymizing purge 30 days out', async () => {
    const now = new Date('2026-07-11T00:00:00Z');
    findOneAndUpdate.mockResolvedValue({
      deletion_requested_at: now,
      deletion_scheduled_for: new Date(now.getTime() + 30 * DAY_MS),
    });

    const result = await service.requestAccountDeletion(userId, now);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      // Only untouched accounts transition — repeat requests keep the original clock.
      expect.objectContaining({ deletion_requested_at: null }),
      expect.objectContaining({
        deletion_requested_at: now,
        deletion_scheduled_for: new Date('2026-08-10T00:00:00Z'),
      }),
      expect.anything(),
    );
    expect(result.deletionScheduledFor).toEqual(
      new Date('2026-08-10T00:00:00Z'),
    );
  });

  it('requestAccountDeletion > given an already-pending request > then returns the existing schedule unchanged', async () => {
    const originalSchedule = new Date('2026-08-01T00:00:00Z');
    // The guarded update matches nothing (request already pending)…
    findOneAndUpdate
      .mockResolvedValueOnce(null)
      // …and the fallback read returns the pending user.
      .mockResolvedValueOnce(null);
    find.mockReturnValue({
      limit: jest.fn().mockReturnThis(),
      exec: jest
        .fn()
        .mockResolvedValue([{ deletion_scheduled_for: originalSchedule }]),
    });

    const result = await service.requestAccountDeletion(
      userId,
      new Date('2026-07-15T00:00:00Z'),
    );

    expect(result.deletionScheduledFor).toEqual(originalSchedule);
  });

  it('cancelAccountDeletion > given the grace window > then clears the scheduled purge', async () => {
    findOneAndUpdate.mockResolvedValue({ deletion_requested_at: null });

    const result = await service.cancelAccountDeletion(userId);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ anonymized_at: null }),
      expect.objectContaining({
        deletion_requested_at: null,
        deletion_scheduled_for: null,
      }),
      expect.anything(),
    );
    expect(result.cancelled).toBe(true);
  });

  it('purgeDueAccountDeletions > given due accounts > then deletes the Firebase user and anonymizes PII', async () => {
    const dueUser = {
      _id: new Types.ObjectId(),
      id_firebase: 'firebase-uid-1',
    };
    find.mockReturnValue({ exec: jest.fn().mockResolvedValue([dueUser]) });

    const purged = await service.purgeDueAccountDeletions(
      new Date('2026-08-11T00:00:00Z'),
    );

    expect(deleteFirebaseUser).toHaveBeenCalledWith('firebase-uid-1');
    expect(updateOne).toHaveBeenCalledWith(
      { _id: dueUser._id },
      expect.objectContaining({
        $set: expect.objectContaining({
          disabled: true,
          email: '',
          mobile: '',
          username: '',
          id_card: '',
          passport: '',
          avatar_url: '',
          id_firebase: `deleted:${dueUser._id.toHexString()}`,
          anonymized_at: expect.any(Date),
        }),
      }),
    );
    expect(purged).toBe(1);
  });

  it('purgeDueAccountDeletions > given a Firebase delete failure > then skips that user for the next run', async () => {
    const dueUser = {
      _id: new Types.ObjectId(),
      id_firebase: 'firebase-uid-2',
    };
    find.mockReturnValue({ exec: jest.fn().mockResolvedValue([dueUser]) });
    deleteFirebaseUser.mockRejectedValue(new Error('firebase down'));

    const purged = await service.purgeDueAccountDeletions(new Date());

    expect(updateOne).not.toHaveBeenCalled();
    expect(purged).toBe(0);
  });

  it('purgeDueAccountDeletions > given an already-deleted Firebase user > then still anonymizes', async () => {
    const dueUser = {
      _id: new Types.ObjectId(),
      id_firebase: 'firebase-uid-3',
    };
    find.mockReturnValue({ exec: jest.fn().mockResolvedValue([dueUser]) });
    const gone = Object.assign(new Error('no user'), {
      code: 'auth/user-not-found',
    });
    deleteFirebaseUser.mockRejectedValue(gone);

    const purged = await service.purgeDueAccountDeletions(new Date());

    expect(updateOne).toHaveBeenCalled();
    expect(purged).toBe(1);
  });
});
