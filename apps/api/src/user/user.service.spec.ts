jest.mock('src/auth/firebase-admin.provider', () => ({
  getAdminAuth: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { UserMyCashback } from './schemas/user-my-cashback.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';

describe('UserService', () => {
  const originalQuestTaskV2Enabled = process.env.QUEST_TASK_V2_ENABLED;
  let service: UserService;
  let findByIdAndUpdate: jest.Mock;
  let findById: jest.Mock;
  let find: jest.Mock;
  let countDocuments: jest.Mock;
  let storedMediaService: {
    replace: jest.Mock;
    getReadableStream: jest.Mock;
  };

  beforeEach(async () => {
    if (originalQuestTaskV2Enabled === undefined) {
      delete process.env.QUEST_TASK_V2_ENABLED;
    } else {
      process.env.QUEST_TASK_V2_ENABLED = originalQuestTaskV2Enabled;
    }
    findByIdAndUpdate = jest.fn().mockResolvedValue({});
    findById = jest.fn();
    find = jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
    countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });
    storedMediaService = {
      replace: jest.fn().mockResolvedValue('local-media:avatar.jpg'),
      getReadableStream: jest.fn().mockResolvedValue({
        contentType: 'image/jpeg',
        stream: {},
      }),
    };
    const userModel = {
      findById,
      findByIdAndUpdate,
      find,
      countDocuments,
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(UserMyCashback.name), useValue: {} },
        { provide: StoredMediaService, useValue: storedMediaService },
      ],
    }).compile();

    service = moduleRef.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fails closed for direct account creation while task-v2 is enabled', async () => {
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    await expect(
      service.createFromFirebase({ id_firebase: 'bypass' } as never),
    ).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'CENTRAL_REGISTRATION_REQUIRED',
      }),
    });
  });

  describe('claimVerifiedPhone', () => {
    const id = new Types.ObjectId();
    const phoneE164 = '+66812345678';

    it('claimVerifiedPhone > given an available canonical phone > then atomically persists identity and display fields', async () => {
      const updated = {
        _id: id,
        mobile: phoneE164,
        verified_phone_e164: phoneE164,
      };
      findByIdAndUpdate.mockResolvedValue(updated);

      await expect(service.claimVerifiedPhone(id, phoneE164)).resolves.toEqual(
        updated,
      );

      expect(findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        {
          $set: {
            mobile: phoneE164,
            verified_phone_e164: phoneE164,
          },
        },
        { new: true, runValidators: true },
      );
    });

    it('claimVerifiedPhone > given another account owns the canonical phone > then returns a safe conflict', async () => {
      findByIdAndUpdate.mockRejectedValue(
        Object.assign(new Error('E11000 duplicate key with sensitive data'), {
          code: 11000,
          keyPattern: { verified_phone_e164: 1 },
        }),
      );

      await expect(service.claimVerifiedPhone(id, phoneE164)).rejects.toEqual(
        expect.objectContaining({
          constructor: ConflictException,
          message:
            'This phone number is already linked to another account. Sign in with that account or use a different phone number.',
        }),
      );
    });

    it('claimVerifiedPhone > given an unrelated persistence failure > then preserves the original failure', async () => {
      const failure = new Error('database unavailable');
      findByIdAndUpdate.mockRejectedValue(failure);

      await expect(service.claimVerifiedPhone(id, phoneE164)).rejects.toBe(
        failure,
      );
    });
  });

  describe('updateProfile', () => {
    const id = new Types.ObjectId();

    // The self-service profile endpoint must never let a user write
    // server-controlled trust/financial fields onto their own document.
    it('updateProfile > given server-controlled fields in the body > then they are stripped before persistence', async () => {
      await service.updateProfile(id, {
        username: 'alice',
        city: 'Bangkok',
        email_verified: true,
        wallet_frozen: false,
        privilege: 'premium',
        credit_tier: 'gold',
        credit_score: 999,
        referred_by: 'attacker-code',
        mobile: '0000000000',
        id_firebase: 'spoofed',
      } as never);

      expect(findByIdAndUpdate).toHaveBeenCalledTimes(1);
      const persisted = findByIdAndUpdate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      for (const field of [
        'email_verified',
        'wallet_frozen',
        'privilege',
        'credit_tier',
        'credit_score',
        'referred_by',
        'mobile',
        'id_firebase',
      ]) {
        expect(persisted).not.toHaveProperty(field);
      }
    });

    it('updateProfile > given legitimate profile fields > then they are persisted', async () => {
      await service.updateProfile(id, {
        username: 'alice',
        city: 'Bangkok',
        zip: '10110',
      } as never);

      const persisted = findByIdAndUpdate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(persisted).toMatchObject({
        username: 'alice',
        city: 'Bangkok',
        zip: '10110',
      });
    });

    it('updateProfile > given the legacy { data } envelope > then it is unwrapped and still allowlisted', async () => {
      await service.updateProfile(id, {
        data: { username: 'bob', privilege: 'premium' },
      } as never);

      const persisted = findByIdAndUpdate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(persisted).toMatchObject({ username: 'bob' });
      expect(persisted).not.toHaveProperty('privilege');
    });

    it('updateProfile > given avatar_url in the body > then it is stripped (upload-only field)', async () => {
      await service.updateProfile(id, {
        username: 'alice',
        avatar_url: 'local-media:spoofed.jpg',
      } as never);

      const persisted = findByIdAndUpdate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(persisted).toMatchObject({ username: 'alice' });
      expect(persisted).not.toHaveProperty('avatar_url');
    });
  });

  describe('uploadProfileAvatar', () => {
    it('uploadProfileAvatar > given a valid file > then replaces media and persists avatar_url', async () => {
      const id = new Types.ObjectId();
      const file = { mimetype: 'image/jpeg' } as Express.Multer.File;
      findById.mockResolvedValue({ avatar_url: 'local-media:old.jpg' });
      findByIdAndUpdate.mockResolvedValue({
        avatar_url: 'local-media:avatar.jpg',
      });

      await service.uploadProfileAvatar(id, file);

      expect(storedMediaService.replace).toHaveBeenCalledWith(
        file,
        MEDIA_FOLDER.PROFILE_AVATARS,
        'local-media:old.jpg',
      );
      expect(findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { avatar_url: 'local-media:avatar.jpg' },
        { new: true },
      );
    });

    it('uploadProfileAvatar > given missing user > then throws UnauthorizedException', async () => {
      findById.mockResolvedValue(null);

      await expect(
        service.uploadProfileAvatar(
          new Types.ObjectId(),
          {} as Express.Multer.File,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('streamProfileAvatar', () => {
    it('streamProfileAvatar > given matching ref > then returns the readable stream', async () => {
      const id = new Types.ObjectId();
      findById.mockResolvedValue({ avatar_url: 'local-media:avatar.jpg' });

      const result = await service.streamProfileAvatar(
        id,
        'local-media:avatar.jpg',
      );

      expect(storedMediaService.getReadableStream).toHaveBeenCalledWith(
        'local-media:avatar.jpg',
      );
      expect(result.contentType).toBe('image/jpeg');
    });

    it('streamProfileAvatar > given mismatched ref > then throws UnauthorizedException', async () => {
      const id = new Types.ObjectId();
      findById.mockResolvedValue({ avatar_url: 'local-media:other.jpg' });

      await expect(
        service.streamProfileAvatar(id, 'local-media:avatar.jpg'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findAll', () => {
    it('findAll > given regex metacharacters > then search input is escaped literally', async () => {
      await service.findAll(1, 10, '  a.*  ');

      expect(find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'a\\.\\*', $options: 'i' } },
          { email: { $regex: 'a\\.\\*', $options: 'i' } },
          { address: { $regex: 'a\\.\\*', $options: 'i' } },
          { mobile: { $regex: 'a\\.\\*', $options: 'i' } },
        ],
      });
      expect(countDocuments).toHaveBeenCalledWith(find.mock.calls[0][0]);
    });

    it('findAll > given an exact 24-hex user ID > then adds an exact ObjectId predicate alongside the escaped text fields', async () => {
      const id = '507f1f77bcf86cd799439011';

      await service.findAll(1, 10, `  ${id}  `);

      expect(find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: id, $options: 'i' } },
          { email: { $regex: id, $options: 'i' } },
          { address: { $regex: id, $options: 'i' } },
          { mobile: { $regex: id, $options: 'i' } },
          { _id: new Types.ObjectId(id) },
        ],
      });
    });

    it.each([
      '507f1f77bcf86cd79943901z',
      '507f1f77bcf86cd79943901',
      'not-a-user-id',
    ])(
      'findAll > given non-ID search %p > then never adds an _id predicate',
      async (search) => {
        await service.findAll(1, 10, search);

        const query = find.mock.calls[0][0] as {
          $or: Record<string, unknown>[];
        };
        expect(query.$or).toHaveLength(4);
        expect(query.$or.every((predicate) => !('_id' in predicate))).toBe(
          true,
        );
      },
    );

    it.each([undefined, '', '   '])(
      'findAll > given empty search %p > then preserves the unfiltered query',
      async (search) => {
        await service.findAll(1, 10, search);

        expect(find).toHaveBeenCalledWith({});
        expect(countDocuments).toHaveBeenCalledWith({});
      },
    );

    it('findAll > trims search before matching every existing text field', async () => {
      await service.findAll(1, 10, '  alice@example.com  ');

      expect(find).toHaveBeenCalledWith({
        $or: [
          {
            username: { $regex: 'alice@example\\.com', $options: 'i' },
          },
          { email: { $regex: 'alice@example\\.com', $options: 'i' } },
          { address: { $regex: 'alice@example\\.com', $options: 'i' } },
          { mobile: { $regex: 'alice@example\\.com', $options: 'i' } },
        ],
      });
    });
  });

  describe('getBalanceMyCashback', () => {
    const userId = new Types.ObjectId().toString();

    function buildService({
      user,
      myCashbackFind,
    }: {
      user: Record<string, unknown>;
      myCashbackFind: jest.Mock;
    }) {
      const userModel = {
        findOne: jest.fn().mockResolvedValue(user),
        findById,
        findByIdAndUpdate,
      };
      const myCashbackModel = {
        find: myCashbackFind,
      };
      return Test.createTestingModule({
        providers: [
          UserService,
          { provide: getModelToken(User.name), useValue: userModel },
          {
            provide: getModelToken(UserMyCashback.name),
            useValue: myCashbackModel,
          },
          { provide: StoredMediaService, useValue: storedMediaService },
        ],
      }).compile();
    }

    it('getBalanceMyCashback > given phone miss and email fallback > then uses anchored escaped email regex', async () => {
      const myCashbackFind = jest
        .fn()
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
      const moduleRef = await buildService({
        user: {
          _id: new Types.ObjectId(userId),
          email: 'a+b@x.com',
          mobile: '+66812345678',
        },
        myCashbackFind,
      });
      const scoped = moduleRef.get<UserService>(UserService);

      await scoped.getBalanceMyCashback(userId);

      expect(myCashbackFind).toHaveBeenLastCalledWith({
        email: { $regex: '^a\\+b@x\\.com$', $options: 'i' },
      });
    });

    it('getBalanceMyCashback > given malformed +66 mobile with no digits > then skips phoneNumber 0 query', async () => {
      const myCashbackFind = jest
        .fn()
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
      const moduleRef = await buildService({
        user: {
          _id: new Types.ObjectId(userId),
          email: 'user@example.com',
          mobile: '+66',
        },
        myCashbackFind,
      });
      const scoped = moduleRef.get<UserService>(UserService);

      await scoped.getBalanceMyCashback(userId);

      expect(myCashbackFind).toHaveBeenNthCalledWith(1, {
        $or: [{ phoneNumber: '+66' }],
      });
      expect(myCashbackFind).not.toHaveBeenCalledWith({
        $or: [{ phoneNumber: '+66' }, { phoneNumber: '0' }],
      });
    });

    it('getBalanceMyCashback > given email lookup returns an unrelated row first > then excludes it from sumBalance', async () => {
      const myCashbackFind = jest
        .fn()
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([
            {
              email: 'xa@b.com',
              balance: [{ amount: 999, currency: 'THB' }],
            },
            {
              email: 'a@b.com',
              balance: [{ amount: 100, currency: 'THB' }],
            },
          ]),
        });
      const moduleRef = await buildService({
        user: {
          _id: new Types.ObjectId(userId),
          email: 'a@b.com',
          mobile: '+66812345678',
        },
        myCashbackFind,
      });
      const scoped = moduleRef.get<UserService>(UserService);

      const result = await scoped.getBalanceMyCashback(userId);

      expect(result.userMyCashback).toHaveLength(1);
      expect(result.sumBalance).toEqual({
        THB: { amount: 100, currency: 'THB' },
      });
    });
  });
});
