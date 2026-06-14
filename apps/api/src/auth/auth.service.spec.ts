import { UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';

// --- Module-level mocks for external SDKs / network / firebase ---------------
// AuthService talks to four things we must never hit for real in a unit test:
//   - axios   (Crossmint signup/signout/refresh + LINE verification HTTP)
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
  getAdminAuth: jest.fn(),
}));

import axios from 'axios';
import { AuthService } from './auth.service';
import { CIO_EVENTS } from 'src/customer-io/customer-io.types';

// Mongo ObjectId-ish strings the service feeds into `new Types.ObjectId(...)`.
const REF_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f191e810c19729de860ea';

type MockUser = {
  _id: { toString: () => string };
  id_firebase?: string;
  disabled?: boolean;
  email?: string;
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
  } = {},
) {
  const userService = {
    findOne: jest.fn(),
    update: jest.fn(),
    createFromFirebase: jest.fn(),
    createFromCrossmint: jest.fn(),
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

  const customerIo = {
    identify: jest.fn().mockResolvedValue(undefined),
    track: jest.fn().mockResolvedValue(undefined),
  };

  const configStore: Record<string, string> = {
    'env.JWT_SECRET': 'test-jwt-secret',
    ...overrides.config,
  };
  const config = {
    get: jest.fn((key: string) => configStore[key]),
  };

  const service = new AuthService(
    config as any,
    userService as any,
    jwtService as any,
    pointModel as any,
    siweNonceModel as any,
    customerIo as any,
  );

  return {
    service,
    userService,
    jwtService,
    pointModel,
    siweNonceModel,
    customerIo,
    config,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  verifyMessageMock.mockReset();
  verifyIdTokenMock.mockReset();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.SIWE_EXPECTED_DOMAIN;
  process.env.JWT_SECRET = 'test-jwt-secret';
});

describe('AuthService', () => {
  it('should be defined', () => {
    const { service } = makeService();
    expect(service).toBeDefined();
  });

  // --- signIn (Crossmint, deprecated) ---------------------------------------
  describe('signIn', () => {
    // The Crossmint path is intentionally dead. It must HARD-FAIL so no caller
    // can accidentally authenticate through a disabled provider.
    it('signIn > given any payload > then it always throws UnauthorizedException', async () => {
      const { service } = makeService();

      await expect(
        service.signIn({
          address: '0xabc',
          id_crossmint: 'cm-1',
          email: 'x@y.co',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // --- signInFirebase -------------------------------------------------------
  describe('signInFirebase', () => {
    it('signInFirebase > given a new user > then it registers and returns the register envelope with a token', async () => {
      const created = makeUser({ id_firebase: 'fb-new' });
      const { service, userService, jwtService, customerIo } = makeService({
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
      // New signups fire signup_completed (not login_completed) for onboarding.
      expect(customerIo.track).toHaveBeenCalledWith(
        USER_ID,
        CIO_EVENTS.signup_completed,
        expect.objectContaining({ provider: 'password' }),
      );
    });

    it('signInFirebase > given an existing user > then it logs in and returns the login envelope', async () => {
      const existing = makeUser({ id_firebase: 'fb-old' });
      const updated = makeUser({ id_firebase: 'fb-old', username: 'member' });
      const { service, userService, customerIo } = makeService({
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
      expect(customerIo.track).toHaveBeenCalledWith(
        USER_ID,
        CIO_EVENTS.login_completed,
        expect.objectContaining({ provider: 'google.com' }),
      );
    });

    // A disabled account must never receive a session token, even with a valid
    // Firebase ID token — this is the account-suspension kill switch.
    it('signInFirebase > given a disabled existing account > then it throws UnauthorizedException and issues no token', async () => {
      const existing = makeUser();
      const disabled = makeUser({ disabled: true });
      const { service, jwtService } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue(disabled),
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
      ).rejects.toBeInstanceOf(UnauthorizedException);
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

    it('signInMiniPaySiwe > given a valid fresh message with an unused nonce for a new wallet > then it provisions a user and returns the register envelope', async () => {
      const created = makeUser({
        id_firebase: `minipay:${ADDRESS.toLowerCase()}`,
      });
      const { service, userService, siweNonceModel, customerIo } = makeService({
        userService: {
          findOne: jest.fn().mockResolvedValue(null),
          createFromFirebase: jest.fn().mockResolvedValue(created),
        },
      });
      verifyMessageMock.mockReturnValue(ADDRESS);
      siweNonceModel.findOneAndDelete.mockResolvedValue({
        nonce: 'abc123nonce',
      });

      const result = await service.signInMiniPaySiwe({
        address: ADDRESS,
        message: freshSiweMessage(),
        signature: '0x' + '1'.repeat(130),
      } as any);

      expect(result.is_new_user).toBe(true);
      expect(result.auth_flow).toBe('register');
      expect(result.token).toBe('signed.jwt.token');
      // The synthetic firebase id namespaces wallet sessions away from real UIDs.
      expect(userService.createFromFirebase).toHaveBeenCalledWith(
        expect.objectContaining({
          id_firebase: `minipay:${ADDRESS.toLowerCase()}`,
          provider: 'minipay',
        }),
      );
      expect(customerIo.track).toHaveBeenCalledWith(
        USER_ID,
        CIO_EVENTS.signup_completed,
        expect.objectContaining({ provider: 'minipay' }),
      );
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

  // --- signUp / signOut / refresh (Crossmint HTTP passthrough) --------------
  describe('signUp', () => {
    it('signUp > given email and password > then it returns the upstream response data', async () => {
      const { service } = makeService();
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'cm-user' } });

      await expect(service.signUp('a@b.co', 'pw')).resolves.toEqual({
        id: 'cm-user',
      });
      expect(axios.post).toHaveBeenCalledTimes(1);
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
