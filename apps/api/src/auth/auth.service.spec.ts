import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac } from 'crypto';

// --- Module-level mocks for external SDKs / network / firebase ---------------
// AuthService talks to three things we must never hit for real in a unit test:
//   - axios   (LINE verification HTTP)
//   - ethers  (SIWE signature recovery)
//   - firebase-admin + getAdminAuth (ID-token verification)
// crypto stays REAL: the Telegram HMAC check and SIWE nonce generation are
// security logic worth exercising for real.
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
  post: jest.fn(),
  get: jest.fn(),
}));

const verifyMessageMock = jest.fn();
jest.mock('ethers', () => ({
  __esModule: true,
  ethers: { verifyMessage: (...args: unknown[]) => verifyMessageMock(...args) },
}));

const verifyIdTokenMock = jest.fn();
jest.mock('firebase-admin', () => ({
  __esModule: true,
  auth: () => ({ verifyIdToken: verifyIdTokenMock }),
}));

jest.mock('./firebase-admin.provider', () => ({
  __esModule: true,
  // firebase-admin 14 is modular-only; the service now calls
  // getAdminAuth().verifyIdToken(...) instead of the removed admin.auth().
  getAdminAuth: jest.fn(() => ({ verifyIdToken: verifyIdTokenMock })),
}));

import axios from 'axios';
import { AuthService } from './auth.service';

// Mongo ObjectId-ish strings the service feeds into `new Types.ObjectId(...)`.
const REF_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f191e810c19729de860ea';

type MockUser = {
  _id: { toString: () => string };
  id_firebase?: string;
  id_line?: string;
  disabled?: boolean;
  email?: string;
  mobile?: string;
  username?: string;
  provider?: string;
  id_telegram?: string;
  address?: string;
};

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    _id: { toString: () => USER_ID },
    id_firebase: 'fb-uid-1',
    disabled: false,
    email: 'member@gogocash.co',
    ...overrides,
  };
}

/**
 * Build an AuthService with every injected dependency mocked. Tests override
 * the specific jest.fn()s they care about. The real class logic runs against
 * these fakes — nothing reaches Mongo, the network, or Firebase.
 */
function makeService(
  overrides: {
    userService?: Partial<Record<string, jest.Mock>>;
    config?: Record<string, string>;
    accountRegistration?: { registerVerified: jest.Mock };
  } = {},
) {
  const userService = {
    findOne: jest.fn(),
    update: jest.fn(),
    claimVerifiedPhone: jest.fn(),
    createFromFirebase: jest.fn(),
    ...overrides.userService,
  };

  const jwtService = {
    sign: jest.fn().mockReturnValue('signed.jwt.token'),
    verify: jest.fn(),
  };

  // Mongoose model mock: callable as a constructor (`new this.pointModel(...)`)
  // AND exposes static query helpers used by updatePoint / SIWE flows.
  const savedPoints: unknown[] = [];
  const pointModel: any = jest.fn().mockImplementation((doc: unknown) => ({
    ...(doc as object),
    save: jest.fn().mockImplementation(async () => {
      savedPoints.push(doc);
      return doc;
    }),
  }));
  pointModel.findOne = jest.fn();
  pointModel.__saved = savedPoints;

  const siweNonceModel = {
    create: jest.fn().mockResolvedValue({}),
    findOneAndDelete: jest.fn(),
  };

  const configStore: Record<string, string> = {
    'env.JWT_SECRET': 'test-jwt-secret',
    'env.LINE_CHANNEL_ID': 'channel',
    ...overrides.config,
  };
  const config = {
    get: jest.fn((key: string) => configStore[key]),
  };

  const accountRegistration = overrides.accountRegistration ?? {
    registerVerified: jest.fn(async (input: { user: unknown }) => ({
      user: await userService.createFromFirebase(input.user),
      created: true,
    })),
  };

  const service = new AuthService(
    config as any,
    userService as any,
    jwtService as any,
    pointModel as any,
    siweNonceModel as any,
    accountRegistration as any,
  );

  return {
    service,
    userService,
    jwtService,
    pointModel,
    siweNonceModel,
    config,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  verifyMessageMock.mockReset();
  verifyIdTokenMock.mockReset();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.SIWE_EXPECTED_DOMAIN;
  delete process.env.QUEST_TASK_V2_ENABLED;
  process.env.JWT_SECRET = 'test-jwt-secret';
});

describe('AuthService', () => {
  it('should be defined', () => {
    const { service } = makeService();
    expect(service).toBeDefined();
  });

  // --- signIn (retired legacy provider) -------------------------------------
  describe('signIn', () => {
    // The legacy path is intentionally dead. It must hard-fail generically and
    // perform no user lookup or provider HTTP call.
    it('signIn > given any payload > then it rejects before provider or user access', async () => {
      const { service, userService } = makeService();

      await expect(
        service.signIn({
          address: '0xabc',
          id_crossmint: 'cm-1',
          email: 'x@y.co',
        } as any),
      ).rejects.toThrow(
        'This sign-in method is no longer available. Please sign in with your usual method.',
      );
      expect(axios.post).not.toHaveBeenCalled();
      expect(userService.findOne).not.toHaveBeenCalled();
    });
  });

  // --- signInFirebase -------------------------------------------------------
  describe('signInFirebase', () => {
    it('signInFirebase > given login intent and an unknown phone identity > then it refuses to create a shadow account', async () => {
      const { service, userService, jwtService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'phone-new',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      await expect(
        service.signInFirebase('id-token', { country: 'TH' } as any, {
          allowPhoneRegistration: false,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(userService.createFromFirebase).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('signInFirebase > given a linked Thai legacy phone > then login resolves the same account accepted by eligibility', async () => {
      const linked = makeUser({
        id_firebase: 'original-line-identity',
        mobile: '0812345678',
        provider: 'line',
      });
      const updated = makeUser({
        id_firebase: 'original-line-identity',
        mobile: '+66812345678',
        provider: 'line',
      });
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(linked),
          claimVerifiedPhone: jest.fn().mockResolvedValue(updated),
          update: jest.fn().mockResolvedValue(updated),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'phone-existing',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      const result = await service.signInFirebase(
        'id-token',
        { country: 'TH' } as any,
        { allowPhoneRegistration: false },
      );

      expect(result.auth_flow).toBe('login');
      expect(userService.findOne).toHaveBeenNthCalledWith(4, {
        mobile: '0812345678',
      });
      expect(userService.claimVerifiedPhone).toHaveBeenCalledWith(
        linked._id,
        '+66812345678',
      );
      expect(userService.update).toHaveBeenCalledWith(
        updated._id,
        expect.objectContaining({
          id_firebase: 'original-line-identity',
          provider: 'line',
        }),
      );
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    it('signInFirebase > given an unlinked phone login > then it returns an actionable recovery path', async () => {
      const { service } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'unlinked-phone',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      await expect(
        service.signInFirebase('id-token', { country: 'TH' } as any, {
          allowPhoneRegistration: false,
        }),
      ).rejects.toThrow(
        'This phone number is not linked to your GoGoCash account. Sign in with your original method, then link it from Profile.',
      );
    });

    it('signInFirebase > given an unknown phone identity and omitted options > then it fails closed', async () => {
      const { service, userService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'phone-new',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      await expect(
        service.signInFirebase('id-token', { country: 'TH' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    it('signInFirebase > given registration intent and an unknown phone identity > then it creates the explicit new account', async () => {
      const created = makeUser({ id_firebase: 'phone-new' });
      const { service, userService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'phone-new',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      const result = await service.signInFirebase(
        'id-token',
        { country: 'TH' } as any,
        { allowPhoneRegistration: true },
      );

      expect(result.auth_flow).toBe('register');
      expect(userService.createFromFirebase).toHaveBeenCalledTimes(1);
      expect(userService.createFromFirebase).toHaveBeenCalledWith(
        expect.objectContaining({
          mobile: '+66812345678',
          verified_phone_e164: '+66812345678',
        }),
      );
    });

    it('signInFirebase > given a new user > then it registers and returns the register envelope with a token', async () => {
      const created = makeUser({ id_firebase: 'fb-new' });
      const { service, userService, jwtService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-new',
        email: 'new@gogocash.co',
        firebase: { sign_in_provider: 'password' },
      });

      const result = await service.signInFirebase('id-token', {
        address: '',
        referral_id: '',
      } as any);

      expect(result.is_new_user).toBe(true);
      expect(result.auth_flow).toBe('register');
      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).toBe(created);
      expect(userService.createFromFirebase).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('signInFirebase > given task-v2 and a verified new provider > then it uses the central transaction only', async () => {
      process.env.QUEST_TASK_V2_ENABLED = 'true';
      const created = makeUser({ id_firebase: 'fb-central' });
      const accountRegistration = {
        registerVerified: jest.fn().mockResolvedValue({
          user: created,
          created: true,
        }),
      };
      const { service, userService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
        accountRegistration,
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-central',
        email: 'central@gogocash.co',
        firebase: { sign_in_provider: 'google.com' },
      });

      await expect(
        service.signInFirebase('id-token', {
          referral_id: REF_ID,
          country: 'TH',
        } as any),
      ).resolves.toMatchObject({ is_new_user: true, user: created });
      expect(accountRegistration.registerVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'firebase:google.com',
          referral_id: REF_ID,
          user: expect.objectContaining({ id_firebase: 'fb-central' }),
        }),
      );
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    it('signInFirebase > given evaluation flag-off after rollout > then it still uses durable registration', async () => {
      process.env.QUEST_TASK_V2_ENABLED = 'false';
      const created = makeUser({ id_firebase: 'fb-rollback' });
      const accountRegistration = {
        registerVerified: jest.fn().mockResolvedValue({
          user: created,
          created: true,
          source_event_id: `account:${USER_ID}:created:v1`,
        }),
      };
      const { service, userService, pointModel } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
        accountRegistration,
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-rollback',
        email: 'rollback@gogocash.co',
        firebase: { sign_in_provider: 'google.com' },
      });

      await expect(
        service.signInFirebase('id-token', { country: 'TH' } as any),
      ).resolves.toMatchObject({ is_new_user: true, user: created });

      expect(accountRegistration.registerVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'firebase:google.com',
          user: expect.objectContaining({ id_firebase: 'fb-rollback' }),
        }),
      );
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
      expect(pointModel.__saved).toHaveLength(0);
    });

    it('signInFirebase > given flag-off and an unlisted verified provider > then it fails closed before account creation', async () => {
      const { service, userService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-unknown-provider',
        email: 'unknown@gogocash.co',
        firebase: { sign_in_provider: 'oidc.unlisted' },
      });

      await expect(
        service.signInFirebase('id-token', { country: 'TH' } as any),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'REGISTRATION_SOURCE_DISABLED',
          source: 'firebase_unknown',
        }),
      });
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    it('signInFirebase > given an existing user > then it logs in and returns the login envelope', async () => {
      const existing = makeUser({ id_firebase: 'fb-old' });
      const updated = makeUser({ id_firebase: 'fb-old', username: 'member' });
      const { service, userService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue(updated),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-old',
        email: 'member@gogocash.co',
        firebase: { sign_in_provider: 'google.com' },
      });

      const result = await service.signInFirebase('id-token', {
        address: '',
        referral_id: '',
      } as any);

      expect(result.is_new_user).toBe(false);
      expect(result.auth_flow).toBe('login');
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
      expect(userService.update).toHaveBeenCalledTimes(1);
    });

    it('signInFirebase > given an unverified email identity > then it cannot relink an existing account by email', async () => {
      const victim = makeUser({ id_firebase: 'victim-line-id' });
      const attacker = makeUser({
        id_firebase: 'attacker-password-id',
        email: 'member@gogocash.co',
      });
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(victim),
          createFromFirebase: jest.fn().mockResolvedValue(attacker),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'attacker-password-id',
        email: 'member@gogocash.co',
        email_verified: false,
        firebase: { sign_in_provider: 'password' },
      });

      const result = await service.signInFirebase(
        'id-token',
        { country: 'TH' } as any,
        { allowPhoneRegistration: false },
      );

      expect(result.auth_flow).toBe('register');
      expect(userService.update).not.toHaveBeenCalled();
      expect(userService.createFromFirebase).toHaveBeenCalledWith(
        expect.objectContaining({ id_firebase: 'attacker-password-id' }),
      );
    });

    it('signInFirebase > given a verified email identity > then it may link the matching account', async () => {
      const existing = makeUser({ id_firebase: 'line-existing' });
      const updated = makeUser({ id_firebase: 'verified-google-id' });
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(existing),
          update: jest.fn().mockResolvedValue(updated),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'verified-google-id',
        email: 'member@gogocash.co',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      });

      const result = await service.signInFirebase('id-token', {
        country: 'TH',
      } as any);

      expect(result.auth_flow).toBe('login');
      expect(userService.update).toHaveBeenCalledTimes(1);
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    // A disabled account must never receive a session token, even with a valid
    // Firebase ID token — this is the account-suspension kill switch.
    it('signInFirebase > given a disabled existing account > then it throws ForbiddenException and issues no token', async () => {
      const existing = makeUser({ disabled: true });
      const { service, jwtService, userService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(existing),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-old',
        email: 'member@gogocash.co',
        firebase: { sign_in_provider: 'password' },
      });

      await expect(
        service.signInFirebase('id-token', {
          address: '',
          referral_id: '',
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(userService.update).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    // An invalid/forged ID token must not leak SDK internals — the catch wraps
    // everything in a 401.
    it('signInFirebase > given verifyIdToken rejects > then it throws UnauthorizedException', async () => {
      const { service } = makeService();
      verifyIdTokenMock.mockRejectedValue(new Error('token expired'));

      await expect(
        service.signInFirebase('bad-token', {
          address: '',
          referral_id: '',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("signInFirebase > given a new user and referral_id is the string 'null' > then it registers without attempting referral credit", async () => {
      const created = makeUser({ id_firebase: 'fb-new' });
      const { service, userService, jwtService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-new',
        email: 'new@gogocash.co',
        firebase: { sign_in_provider: 'password' },
      });

      const result = await service.signInFirebase('id-token', {
        address: '',
        referral_id: 'null',
      } as any);

      expect(result.is_new_user).toBe(true);
      expect(result.auth_flow).toBe('register');
      expect(result.token).toBe('signed.jwt.token');
      expect(userService.createFromFirebase).toHaveBeenCalledTimes(1);
      expect(userService.findOne).toHaveBeenCalledTimes(1);
      expect(userService.findOne).toHaveBeenCalledWith({
        id_firebase: 'fb-new',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('signInFirebase > given a new user and referral_id is not a valid ObjectId > then it registers without attempting referral credit', async () => {
      const created = makeUser({ id_firebase: 'fb-new' });
      const { service, userService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-new',
        email: 'new@gogocash.co',
        firebase: { sign_in_provider: 'password' },
      });

      const result = await service.signInFirebase('id-token', {
        address: '',
        referral_id: 'not-an-object-id',
      } as any);

      expect(result.is_new_user).toBe(true);
      expect(result.auth_flow).toBe('register');
      expect(userService.findOne).toHaveBeenCalledTimes(1);
      expect(userService.findOne).toHaveBeenCalledWith({
        id_firebase: 'fb-new',
      });
    });

    it('signInFirebase > given referral award throws > then registration still succeeds', async () => {
      const created = makeUser({ id_firebase: 'fb-new' });
      const referrer = makeUser({ _id: { toString: () => REF_ID } });
      const { service, pointModel } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(referrer),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
      });
      pointModel.findOne.mockRejectedValue(new Error('db down'));
      verifyIdTokenMock.mockResolvedValue({
        uid: 'fb-new',
        email: 'new@gogocash.co',
        firebase: { sign_in_provider: 'password' },
      });

      const result = await service.signInFirebase('id-token', {
        address: '',
        referral_id: REF_ID,
      } as any);

      expect(result.is_new_user).toBe(true);
      expect(result.auth_flow).toBe('register');
      expect(result.token).toBe('signed.jwt.token');
    });
  });

  describe('isPhoneLoginEligible', () => {
    it('given a canonical linked phone > returns true', async () => {
      const linked = makeUser();
      const { service, userService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(linked) },
      });

      await expect(service.isPhoneLoginEligible('+66812345678')).resolves.toBe(
        true,
      );
      expect(userService.findOne).toHaveBeenCalledWith({
        verified_phone_e164: '+66812345678',
      });
    });

    it('given a Thai legacy local-format phone > checks the bounded local candidate', async () => {
      const linked = makeUser();
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(linked),
        },
      });

      await expect(service.isPhoneLoginEligible('+66812345678')).resolves.toBe(
        true,
      );
      expect(userService.findOne).toHaveBeenNthCalledWith(3, {
        mobile: '0812345678',
      });
    });

    it('given 063 and +6663 forms > resolves both to the same account identity', async () => {
      const linked = makeUser({ mobile: '0631234567' });
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(linked),
        },
      });

      await expect(service.isPhoneLoginEligible('+66631234567')).resolves.toBe(
        true,
      );
      expect(userService.findOne).toHaveBeenNthCalledWith(3, {
        mobile: '0631234567',
      });
    });

    it('given an unknown or disabled phone > returns the same false result', async () => {
      const unknown = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
      });
      const disabled = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(makeUser({ disabled: true })),
        },
      });

      await expect(
        unknown.service.isPhoneLoginEligible('+6591234567'),
      ).resolves.toBe(false);
      await expect(
        disabled.service.isPhoneLoginEligible('+6591234567'),
      ).resolves.toBe(false);
    });
  });

  describe('verifyPhone', () => {
    it('given a verified Thai phone > stores one canonical E.164 identity', async () => {
      const currentUser = makeUser({ mobile: '' });
      const updatedUser = makeUser({ mobile: '+66812345678' });
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(currentUser)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null),
          claimVerifiedPhone: jest.fn().mockResolvedValue(updatedUser),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'phone-uid',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      await expect(
        service.verifyPhone('phone-token', USER_ID),
      ).resolves.toEqual({ uid: 'phone-uid', user: updatedUser });
      expect(userService.claimVerifiedPhone).toHaveBeenCalledWith(
        currentUser._id,
        '+66812345678',
      );
    });

    it('given the canonical or legacy phone belongs to another account > refuses the link', async () => {
      const currentUser = makeUser({ mobile: '' });
      const otherUser = makeUser({
        _id: { toString: () => REF_ID },
        mobile: '0812345678',
      });
      const { service, userService } = makeService({
        userService: {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(currentUser)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(otherUser),
        },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'phone-uid',
        phone_number: '+66812345678',
        firebase: { sign_in_provider: 'phone' },
      });

      await expect(
        service.verifyPhone('phone-token', USER_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(userService.claimVerifiedPhone).not.toHaveBeenCalled();
    });

    it('given a non-phone identity token > refuses to link it as a phone', async () => {
      const { service } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(makeUser()) },
      });
      verifyIdTokenMock.mockResolvedValue({
        uid: 'google-uid',
        email: 'member@gogocash.co',
        firebase: { sign_in_provider: 'google.com' },
      });

      await expect(
        service.verifyPhone('google-token', USER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('given an invalid or expired verification token > requests a fresh code', async () => {
      const { service, userService } = makeService();
      verifyIdTokenMock.mockRejectedValue(new Error('provider token details'));

      await expect(
        service.verifyPhone('expired-token', USER_ID),
      ).rejects.toThrow(
        'Your phone verification expired. Request a new code and try again.',
      );
      expect(userService.findOne).not.toHaveBeenCalled();
      expect(userService.update).not.toHaveBeenCalled();
    });
  });

  describe('signInLine', () => {
    const payload = {
      id_line: 'U123456789',
      username: 'LINE Member',
      country: 'TH',
    } as any;

    it('given no access token > returns a safe session error before user access', async () => {
      const { service, userService } = makeService();

      await expect(service.signInLine(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('given LINE rejects an expired token > returns an actionable 401', async () => {
      const { service } = makeService();
      (axios.get as jest.Mock).mockRejectedValueOnce({
        response: { status: 401 },
      });

      await expect(service.signInLine(payload, 'expired')).rejects.toThrow(
        'Your LINE sign-in session expired. Start LINE sign-in again.',
      );
    });

    it('given LINE is unavailable > returns a retryable provider failure', async () => {
      const { service } = makeService();
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('network down'));

      await expect(service.signInLine(payload, 'token')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('given the expected LINE channel is not configured > fails closed before profile or user access', async () => {
      const { service, userService } = makeService({
        config: { 'env.LINE_CHANNEL_ID': '' },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { client_id: 'channel' },
      });

      await expect(service.signInLine(payload, 'token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('given a valid token issued for another LINE channel > refuses it before profile or user access', async () => {
      const { service, userService } = makeService();
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: { client_id: 'attacker-channel' },
      });

      await expect(service.signInLine(payload, 'token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('given the verified profile does not match the claimed LINE user > refuses the identity', async () => {
      const { service } = makeService();
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: 'U-other' } });

      await expect(service.signInLine(payload, 'token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('given the LINE account is disabled > does not mutate it or issue a token', async () => {
      const disabled = makeUser({ disabled: true, id_line: payload.id_line });
      const { service, userService, jwtService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(disabled) },
      });
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await expect(service.signInLine(payload, 'token')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(userService.update).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('given email linking lacks its OTP token > preserves the specific 400 error', async () => {
      const { service } = makeService();
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await expect(
        service.signInLine(
          { ...payload, email: 'member@gogocash.co' },
          'token',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('given account persistence fails > returns a safe system error', async () => {
      const existing = makeUser({ id_line: payload.id_line });
      const { service } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockRejectedValue(new Error('mongo host details')),
        },
      });
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await expect(service.signInLine(payload, 'token')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('given a valid token for an existing account > returns a backend session', async () => {
      const existing = makeUser({ id_line: payload.id_line });
      const updated = makeUser({ id_line: payload.id_line });
      const { service } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue(updated),
        },
      });
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await expect(service.signInLine(payload, 'token')).resolves.toEqual({
        user: updated,
        token: 'signed.jwt.token',
      });
    });

    it('given task-v2 and a verified new LINE identity > uses the central transaction only', async () => {
      process.env.QUEST_TASK_V2_ENABLED = 'true';
      const created = makeUser({
        id_firebase: `line_${payload.id_line}`,
        id_line: payload.id_line,
      });
      const accountRegistration = {
        registerVerified: jest.fn().mockResolvedValue({
          user: created,
          created: true,
        }),
      };
      const { service, userService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
        accountRegistration,
      });
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await expect(service.signInLine(payload, 'token')).resolves.toEqual({
        user: created,
        token: 'signed.jwt.token',
      });
      expect(accountRegistration.registerVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'line',
          user: expect.objectContaining({
            id_firebase: `line_${payload.id_line}`,
          }),
        }),
      );
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    it('given a new LINE identity with a picture_url > persists avatar_url on the created user', async () => {
      const created = makeUser({
        id_firebase: `line_${payload.id_line}`,
        id_line: payload.id_line,
        avatar_url: 'https://profile.line-scdn.net/avatar.png',
      });
      const accountRegistration = {
        registerVerified: jest.fn().mockResolvedValue({
          user: created,
          created: true,
        }),
      };
      const { service, userService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
        accountRegistration,
      });
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await expect(
        service.signInLine(
          {
            ...payload,
            picture_url: 'https://profile.line-scdn.net/avatar.png',
          },
          'token',
        ),
      ).resolves.toEqual({
        user: created,
        token: 'signed.jwt.token',
      });
      expect(accountRegistration.registerVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            avatar_url: 'https://profile.line-scdn.net/avatar.png',
          }),
        }),
      );
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    it('given a legacy LINE account without a stored Firebase id > persists the synthetic session identity used by the auth guard', async () => {
      const existing = makeUser({
        id_firebase: '',
        id_line: payload.id_line,
        provider: 'line',
      });
      const updated = makeUser({
        id_firebase: `line_${payload.id_line}`,
        id_line: payload.id_line,
        provider: 'line',
      });
      const { service, userService, jwtService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue(updated),
        },
      });
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { client_id: 'channel' } })
        .mockResolvedValueOnce({ data: { userId: payload.id_line } });

      await service.signInLine(payload, 'token');

      expect(userService.update).toHaveBeenCalledWith(
        existing._id,
        expect.objectContaining({ id_firebase: `line_${payload.id_line}` }),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ firebaseId: `line_${payload.id_line}` }),
        expect.any(Object),
      );
    });
  });

  // --- signInTelegram -------------------------------------------------------
  describe('signInTelegram', () => {
    // Without the bot token configured, the HMAC cannot be verified, so login
    // MUST be refused rather than trusting the unverified payload.
    it('signInTelegram > given TELEGRAM_BOT_TOKEN is not set > then it throws UnauthorizedException', async () => {
      const { service, userService } = makeService();

      await expect(
        service.signInTelegram({
          id: 123,
          first_name: 'A',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'deadbeef',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('signInTelegram > given a verified unknown identity > then disabled registration fails before user mutation', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
      const { service, userService } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(null) },
      });
      jest.spyOn(service, 'verifyTelegramAuth').mockResolvedValue(true);

      await expect(
        service.signInTelegram({
          id: 123,
          first_name: 'A',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'verified-by-spy',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });

    // A forged HMAC must be rejected: this is the anti-impersonation control.
    it('signInTelegram > given an invalid HMAC hash > then it throws UnauthorizedException', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-secret';
      const { service, userService } = makeService();

      await expect(
        service.signInTelegram({
          id: 123,
          first_name: 'A',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'ffffffffffffffffffffffffffffffff',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    // Even a correctly-signed but stale (>60s) payload must be rejected to stop
    // replay of a captured legitimate login.
    it('signInTelegram > given a valid signature but expired auth_date > then it throws UnauthorizedException', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-secret';
      const { service } = makeService();
      const payload: any = {
        id: 123,
        first_name: 'A',
        auth_date: Math.floor(Date.now() / 1000) - 600, // 10 min old
      };
      payload.hash = signTelegram(payload, 'bot-secret');

      await expect(service.signInTelegram(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    // Cross-provider account-takeover guard: a fresh Telegram login whose email
    // already belongs to a DIFFERENT provider must NOT silently merge.
    it('signInTelegram > given a fresh telegram login whose email belongs to a non-telegram account > then it refuses to merge', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-secret';
      const emailOwner = makeUser({
        provider: 'firebase',
        id_telegram: undefined,
        email: 'victim@gogocash.co',
      });
      const { service, userService } = makeService({
        userService: {
          // 1st call: lookup by id_telegram → none. 2nd call: lookup by email → existing firebase user.
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(emailOwner),
          update: jest.fn(),
        },
      });
      const payload: any = {
        id: 999,
        first_name: 'A',
        email: 'victim@gogocash.co',
        auth_date: Math.floor(Date.now() / 1000),
      };
      payload.hash = signTelegram(payload, 'bot-secret');

      await expect(service.signInTelegram(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(userService.update).not.toHaveBeenCalled();
    });
  });

  // --- verifyTelegramAuth ---------------------------------------------------
  describe('verifyTelegramAuth', () => {
    it('verifyTelegramAuth > given a hash computed with the bot token > then it returns true', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-secret';
      const { service } = makeService();
      const payload: any = { id: 1, first_name: 'A', auth_date: 1700000000 };
      payload.hash = signTelegram(payload, 'bot-secret');

      await expect(service.verifyTelegramAuth(payload)).resolves.toBe(true);
    });

    it('verifyTelegramAuth > given a tampered hash > then it returns false', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-secret';
      const { service } = makeService();

      await expect(
        service.verifyTelegramAuth({
          id: 1,
          first_name: 'A',
          auth_date: 1700000000,
          hash: 'aa',
        }),
      ).resolves.toBe(false);
    });
  });

  // --- signInMiniPaySiwe ----------------------------------------------------
  describe('signInMiniPaySiwe', () => {
    const ADDRESS = '0x' + 'a'.repeat(40);

    function freshSiweMessage(): string {
      const issuedAt = new Date().toISOString();
      return [
        'example.com wants you to sign in with your Ethereum account:',
        ADDRESS,
        '',
        'Sign in',
        '',
        'URI: https://example.com',
        'Version: 1',
        'Chain ID: 1',
        'Nonce: abc123nonce',
        `Issued At: ${issuedAt}`,
      ].join('\n');
    }

    it('signInMiniPaySiwe > given a signature that does not recover the claimed address > then it throws UnauthorizedException', async () => {
      const { service, siweNonceModel } = makeService();
      verifyMessageMock.mockReturnValue('0x' + 'b'.repeat(40)); // different address

      await expect(
        service.signInMiniPaySiwe({
          address: ADDRESS,
          message: freshSiweMessage(),
          signature: '0x' + '1'.repeat(130),
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      // Address mismatch is rejected BEFORE the nonce is consumed.
      expect(siweNonceModel.findOneAndDelete).not.toHaveBeenCalled();
    });

    it('signInMiniPaySiwe > given ethers.verifyMessage throws > then it throws UnauthorizedException', async () => {
      const { service } = makeService();
      verifyMessageMock.mockImplementation(() => {
        throw new Error('bad signature bytes');
      });

      await expect(
        service.signInMiniPaySiwe({
          address: ADDRESS,
          message: freshSiweMessage(),
          signature: '0xdead',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    // Replay defence: a message whose nonce is already consumed must fail the
    // second time even though the signature is otherwise valid and fresh.
    it('signInMiniPaySiwe > given the nonce was already used > then it throws UnauthorizedException', async () => {
      const { service, siweNonceModel } = makeService();
      verifyMessageMock.mockReturnValue(ADDRESS);
      siweNonceModel.findOneAndDelete.mockResolvedValue(null); // nonce gone

      await expect(
        service.signInMiniPaySiwe({
          address: ADDRESS,
          message: freshSiweMessage(),
          signature: '0x' + '1'.repeat(130),
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(siweNonceModel.findOneAndDelete).toHaveBeenCalledWith({
        nonce: 'abc123nonce',
      });
    });

    // Freshness window: a message issued well outside the 5-min window must be
    // rejected, again before the nonce is touched.
    it('signInMiniPaySiwe > given an Issued At older than the freshness window > then it throws UnauthorizedException', async () => {
      const { service, siweNonceModel } = makeService();
      verifyMessageMock.mockReturnValue(ADDRESS);
      const stale = new Date(Date.now() - 10 * 60_000).toISOString();
      const message = freshSiweMessage().replace(
        /Issued At: .*/,
        `Issued At: ${stale}`,
      );

      await expect(
        service.signInMiniPaySiwe({
          address: ADDRESS,
          message,
          signature: '0x' + '1'.repeat(130),
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(siweNonceModel.findOneAndDelete).not.toHaveBeenCalled();
    });

    it('signInMiniPaySiwe > given a valid new wallet > then disabled MiniPay registration fails before user mutation', async () => {
      const { service, userService, siweNonceModel } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
        },
      });
      verifyMessageMock.mockReturnValue(ADDRESS);
      siweNonceModel.findOneAndDelete.mockResolvedValue({
        nonce: 'abc123nonce',
      });

      await expect(
        service.signInMiniPaySiwe({
          address: ADDRESS,
          message: freshSiweMessage(),
          signature: '0x' + '1'.repeat(130),
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(userService.createFromFirebase).not.toHaveBeenCalled();
    });
  });

  // --- signInAi -------------------------------------------------------------
  describe('signInAi', () => {
    it('signInAi > given an empty email > then it returns null without querying', async () => {
      const { service, userService } = makeService();

      await expect(service.signInAi('')).resolves.toBeNull();
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('signInAi > given a known email > then it returns the matched user', async () => {
      const user = makeUser();
      const { service } = makeService({
        userService: { findOne: jest.fn().mockResolvedValue(user) },
      });

      await expect(service.signInAi('member@gogocash.co')).resolves.toBe(user);
    });

    // The admin caller only checks Boolean(user); a DB error must degrade to
    // null, never leak the upstream error.
    it('signInAi > given the lookup throws > then it returns null', async () => {
      const { service } = makeService({
        userService: {
          findOne: jest.fn().mockRejectedValue(new Error('db down')),
        },
      });

      await expect(service.signInAi('member@gogocash.co')).resolves.toBeNull();
    });
  });

  // --- updatePoint (money) --------------------------------------------------
  describe('updatePoint', () => {
    // Referral reward correctness: a first-time referral credits exactly 50
    // points to the referrer with type 'add' / action 'referral'.
    it('updatePoint > given no existing referral point > then it credits 50 points to the referrer', async () => {
      const { service, pointModel } = makeService();
      pointModel.findOne.mockResolvedValue(null);

      await service.updatePoint({ referral_id: REF_ID, user_id: USER_ID });

      expect(pointModel).toHaveBeenCalledTimes(1);
      const created = pointModel.mock.calls[0][0];
      expect(created.point).toBe(50);
      expect(created.type).toBe('add');
      expect(created.action).toBe('referral');
    });

    // Idempotency: if the referral point already exists, it must NOT be credited
    // again — double-paying referrals is a money bug.
    it('updatePoint > given the referral point already exists > then it does not credit again', async () => {
      const { service, pointModel } = makeService();
      pointModel.findOne.mockResolvedValue({ _id: 'existing-point' });

      await service.updatePoint({ referral_id: REF_ID, user_id: USER_ID });

      expect(pointModel).not.toHaveBeenCalled();
    });

    it("updatePoint > given referral_id is the string 'null' > then it credits nothing", async () => {
      const { service, pointModel } = makeService();

      await service.updatePoint({ referral_id: 'null', user_id: USER_ID });

      expect(pointModel.findOne).not.toHaveBeenCalled();
      expect(pointModel).not.toHaveBeenCalled();
    });
  });

  // --- generateToken / verifyTempToken --------------------------------------
  describe('generateToken', () => {
    // Sessions must be signed with the configured secret and expire — a missing
    // secret or non-expiring token is an auth defect.
    it('generateToken > given a payload > then it signs with JWT_SECRET and a 1d expiry', async () => {
      const { service, jwtService } = makeService();

      const token = await service.generateToken({
        userId: USER_ID,
        firebaseId: 'fb-uid-1',
      });

      expect(token).toBe('signed.jwt.token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { userId: USER_ID, firebaseId: 'fb-uid-1' },
        expect.objectContaining({ secret: 'test-jwt-secret', expiresIn: '1d' }),
      );
    });
  });

  describe('verifyTempToken', () => {
    it('verifyTempToken > given a valid otp_verified token > then it returns the email', async () => {
      const { service, jwtService } = makeService();
      jwtService.verify.mockReturnValue({
        type: 'otp_verified',
        email: 'otp@gogocash.co',
      });

      await expect(service.verifyTempToken('temp')).resolves.toEqual({
        email: 'otp@gogocash.co',
      });
    });

    // A token of the wrong type must be rejected so a non-OTP token can't be
    // replayed into the LINE email-linking flow.
    it('verifyTempToken > given a token with the wrong type > then it throws UnauthorizedException', async () => {
      const { service, jwtService } = makeService();
      jwtService.verify.mockReturnValue({ type: 'access', email: 'x@y.co' });

      await expect(service.verifyTempToken('temp')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('verifyTempToken > given verify throws (expired/forged) > then it throws UnauthorizedException', async () => {
      const { service, jwtService } = makeService();
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.verifyTempToken('temp')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  // --- issueSiweNonce -------------------------------------------------------
  describe('issueSiweNonce', () => {
    // The issued nonce must be a non-trivial random hex string AND be persisted,
    // otherwise the single-use replay defence has nothing to consume.
    it('issueSiweNonce > when called > then it persists a random hex nonce and returns it', async () => {
      const { service, siweNonceModel } = makeService();

      const { nonce } = await service.issueSiweNonce();

      expect(nonce).toMatch(/^[0-9a-f]{32}$/);
      expect(siweNonceModel.create).toHaveBeenCalledWith({ nonce });
    });
  });
});

// --- helpers ----------------------------------------------------------------
// Recreate the exact HMAC the service computes so a "valid signature" fixture
// is genuinely valid against the real crypto path (no mocking of crypto).
function signTelegram(
  payload: Record<string, unknown>,
  botToken: string,
): string {
  // Strip the `hash` field (it is what we are recomputing) without binding an
  // unused variable.
  const rest: Record<string, unknown> = { ...payload };
  delete rest.hash;
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  return createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}
