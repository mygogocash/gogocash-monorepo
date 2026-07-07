import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { UserMyCashback } from './schemas/user-my-cashback.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';

describe('UserService', () => {
  let service: UserService;
  let findByIdAndUpdate: jest.Mock;
  let findById: jest.Mock;
  let storedMediaService: {
    replace: jest.Mock;
    getReadableStream: jest.Mock;
  };

  beforeEach(async () => {
    findByIdAndUpdate = jest.fn().mockResolvedValue({});
    findById = jest.fn();
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
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
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
      const find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      const countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      const moduleRef = await Test.createTestingModule({
        providers: [
          UserService,
          {
            provide: getModelToken(User.name),
            useValue: { find, countDocuments, findByIdAndUpdate },
          },
          { provide: getModelToken(UserMyCashback.name), useValue: {} },
          { provide: StoredMediaService, useValue: storedMediaService },
        ],
      }).compile();
      const scoped = moduleRef.get<UserService>(UserService);

      await scoped.findAll(1, 10, 'a.*');

      expect(find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'a\\.\\*', $options: 'i' } },
          { email: { $regex: 'a\\.\\*', $options: 'i' } },
          { address: { $regex: 'a\\.\\*', $options: 'i' } },
          { mobile: { $regex: 'a\\.\\*', $options: 'i' } },
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
