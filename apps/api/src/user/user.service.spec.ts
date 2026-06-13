import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { UserMyCashback } from './schemas/user-my-cashback.schema';

describe('UserService', () => {
  let service: UserService;
  let findByIdAndUpdate: jest.Mock;

  beforeEach(async () => {
    findByIdAndUpdate = jest.fn().mockResolvedValue({});
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: { findByIdAndUpdate } },
        { provide: getModelToken(UserMyCashback.name), useValue: {} },
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
  });
});
