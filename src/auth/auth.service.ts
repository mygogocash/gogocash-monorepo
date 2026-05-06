import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
// Crossmint deprecated — auth now flows via Firebase + SIWE only.
import { UserService } from 'src/user/user.service';
import {
  MiniPaySiweDto,
  SignInDto,
  SignInFirebaseDto,
  TelegramAuthDto,
} from './dto/auth.dto';
import { ethers } from 'ethers';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Point, PointDocument } from 'src/point/schemas/point.schema';
import { getAdminAuth } from './firebase-admin.provider';
import * as admin from 'firebase-admin';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SiweNonce, SiweNonceDocument } from './schemas/siwe-nonce.schema';
import { UserDocument } from 'src/user/schemas/user.schema';
import { CustomerIoService } from 'src/customer-io/customer-io.service';
import { CIO_EVENTS } from 'src/customer-io/customer-io.types';
import { toIso2Server } from 'src/utils/country';
@Injectable()
export class AuthService {
  private baseUrl: string;
  private projectId: string;
  private secret: string;
  private httpsAgent: https.Agent;
  private crossmint: any;
  private crossmintAuth: any;

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectModel(Point.name) private pointModel: Model<PointDocument>,
    @InjectModel(SiweNonce.name)
    private siweNonceModel: Model<SiweNonceDocument>,
    private readonly customerIo: CustomerIoService,
  ) {
    this.baseUrl = this.config.get<string>('env.CROSSMINT_BASE_URL') ?? '';
    this.projectId = this.config.get<string>('env.CROSSMINT_PROJECT_ID') ?? '';
    this.secret = this.config.get<string>('env.CROSSMINT_SECRET') ?? '';
    this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    // Crossmint SDK removed; signIn() path will throw if invoked.
    this.crossmint = null;
    this.crossmintAuth = null;
  }

  private headers() {
    return { Authorization: `Bearer ${this.secret}` };
  }

  async signUp(email: string, password: string) {
    const res = await axios.post(
      `${this.baseUrl}/signup`,
      { email, password, projectId: this.projectId },
      { headers: this.headers() },
    );
    return res.data;
  }

  async signIn(payload: SignInDto): Promise<never> {
    // Crossmint deprecated. Callers should use Firebase or SIWE sign-in flows.
    void payload;
    throw new UnauthorizedException(
      'Crossmint sign-in is disabled. Use /auth/log-in (Firebase) or /auth/minipay-siwe instead.',
    );
    // unreachable code preserved below for reference during migration
    /*
    const data = await this.crossmintAuth.getUser(payload.id_crossmint);
    // console.log('data', data);
    if (!data.id) {
      throw new Error('User not found in Crossmint');
    }
    // console.log('payload', data.id);
    const userExist = await this.userService.findOne({
      id_crossmint: data.id,
    });
    // console.log('userExist', userExist);
    if (userExist) {
      if (userExist.address) {
        const user = await this.userService.update(userExist._id, {
          email: data.email,
          username: data?.twitter
            ? data.twitter.username
            : data?.email?.split('@')[0],
          id_twitter: data?.twitter ? data.twitter.id : '',
          address: payload.address,
        });
        return user;
      }
      return userExist;
    }
    const user = await this.userService.createFromCrossmint({
      address: payload.address,
      id_crossmint: data.id,
      email: data.email,
      username: data?.twitter
        ? data.twitter.username
        : data?.email?.split('@')[0],
      id_twitter: data?.twitter ? data.twitter.id : '',
    });

    if (
      payload.referral_id &&
      payload?.referral_id != 'undefined' &&
      payload?.referral_id != 'null'
    ) {
      const refData = await this.userService.findOne({
        _id: new Types.ObjectId(payload.referral_id),
      });
      if (refData && user._id?.toString() !== payload.referral_id?.toString()) {
        await this.updatePoint({
          user_id: user._id.toString(),
          referral_id: payload.referral_id,
        });
      }
    }
    // Update points for referral if referral_id is provided
    return user; // { accessToken, refreshToken, user }
    */
  }

  async signInFirebase(token: string, payload: SignInFirebaseDto) {
    try {
      getAdminAuth();
      const data = await admin.auth().verifyIdToken(token);
      if (!data) {
        throw new Error('User not found in Gogocash');
      }
      // console.log('payload', data.id);
      let userExist = await this.userService.findOne({
        id_firebase: data.uid,
      });
      if (!userExist && data.email) {
        userExist = await this.userService.findOne({
          email: data.email,
        });
      }

      if (userExist) {
        const user = await this.userService.update(userExist._id, {
          email: data.email,
          username: data?.twitter
            ? data.twitter.username
            : data?.name || data?.email?.split('@')[0],
          id_twitter: data?.twitter ? data.twitter.id : '',
          address:
            payload?.address && payload?.address !== 'undefined'
              ? payload?.address
              : '',
          id_firebase: data.uid,
          country: toIso2Server(payload?.country),
          provider: data?.firebase?.sign_in_provider,
        });
        if (user?.disabled) {
          throw new Error('Your account has been disabled');
        }
        const accessToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase,
        });
        // Fire-and-forget — keep marketing's profile fresh on every login.
        // Failures log a warning, never block the login response.
        void this.customerIo.identify(user);
        void this.customerIo.track(
          user._id.toString(),
          CIO_EVENTS.login_completed,
          { provider: data?.firebase?.sign_in_provider },
        );
        return {
          user,
          token: accessToken,
          is_new_user: false,
          auth_flow: 'login' as const,
        };
      }
      const user = await this.userService.createFromFirebase({
        address:
          payload?.address && payload?.address !== 'undefined'
            ? payload?.address
            : '',
        id_crossmint: '',
        email: data.email,
        username: data?.twitter
          ? data.twitter.username
          : data?.name || data?.email?.split('@')[0],
        id_twitter: data?.twitter ? data.twitter?.id : '',
        id_firebase: data.uid,
        country: toIso2Server(payload?.country),
        provider: data?.firebase?.sign_in_provider,
      });
      if (payload?.referral_id && payload.referral_id !== 'undefined') {
        const refData = await this.userService.findOne({
          _id: new Types.ObjectId(payload?.referral_id),
        });
        if (
          refData &&
          user._id?.toString() !== payload.referral_id?.toString()
        ) {
          await this.updatePoint({
            user_id: user._id.toString(),
            referral_id: payload.referral_id,
          });
        }
      }

      if (user?.disabled) {
        throw new Error('Your account has been disabled');
      }
      const accessToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase,
      });
      // Identify first so the signup_completed event fires against a profile
      // that already has its core traits set — onboarding journeys read them
      // immediately.
      void this.customerIo.identify(user);
      void this.customerIo.track(
        user._id.toString(),
        CIO_EVENTS.signup_completed,
        {
          provider: data?.firebase?.sign_in_provider,
          referral_id: payload?.referral_id || undefined,
        },
      );
      return {
        user,
        token: accessToken,
        is_new_user: true,
        auth_flow: 'register' as const,
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        error?.message || 'Invalid Firebase token',
      );
    }
  }

  async signInTelegram(payload: TelegramAuthDto) {
    try {
      // Verify the Telegram-provided HMAC. Without this, anyone can POST
      // arbitrary {id, email} and impersonate any Telegram-linked user.
      // Also reject stale payloads (>60s) to prevent replay of captured
      // legitimate logins.
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        throw new UnauthorizedException(
          'Telegram login is not configured on this server',
        );
      }
      const valid = await this.verifyTelegramAuth(payload);
      if (!valid) {
        throw new UnauthorizedException('Invalid Telegram signature');
      }
      const ageSeconds =
        Math.floor(Date.now() / 1000) - Number(payload.auth_date || 0);
      if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds > 60) {
        throw new UnauthorizedException('Telegram auth payload expired');
      }
      const data = payload;

      let userExist = await this.userService.findOne({
        id_telegram: data.id.toString(),
      });

      // Cross-provider collision guard: if no user matches by Telegram ID
      // but the email matches an existing record from a DIFFERENT provider
      // (Firebase, MiniPay, etc.), refuse to merge silently. An attacker
      // with a Telegram account using the victim's email could otherwise
      // hijack the victim's record. Require the user to verify ownership
      // through the original provider (or an OTP linking flow we don't
      // ship yet) before linking accounts.
      if (!userExist && data.email) {
        const emailMatch = await this.userService.findOne({
          email: data.email,
        });
        const alreadyLinkedToTelegram =
          emailMatch &&
          (emailMatch.id_telegram === data.id.toString() ||
            emailMatch.provider === 'telegram');
        if (emailMatch && !alreadyLinkedToTelegram) {
          throw new UnauthorizedException(
            'An account already exists for this email under a different sign-in method. ' +
              'Please sign in with your original method, then link Telegram from your profile.',
          );
        }
        userExist = emailMatch;
      }

      if (userExist) {
        const user = await this.userService.update(userExist._id, {
          email: userExist?.email || data.email,
          username: userExist.username || data?.username || '',
          id_twitter: userExist?.id_twitter || '',
          id_telegram: data.id.toString(),
          address: userExist?.address || '',
          id_firebase: userExist?.id_firebase || `telegram_${data.id}`,
          country: toIso2Server(userExist?.country || data?.country),
          provider: userExist?.provider || 'telegram',
        });
        if (user?.disabled) {
          throw new Error('Your account has been disabled');
        }
        const accessToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase,
        });
        void this.customerIo.identify(user, { provider: 'telegram' });
        void this.customerIo.track(
          user._id.toString(),
          CIO_EVENTS.login_completed,
          { provider: 'telegram' },
        );
        return {
          user,
          token: accessToken,
          is_new_user: false,
          auth_flow: 'login' as const,
        };
      }
      const user = await this.userService.createFromFirebase({
        email: data?.email,
        username: data?.username || '',
        id_twitter: userExist?.id_twitter || '',
        id_telegram: data.id.toString(),
        address: '',
        id_firebase: userExist?.id_firebase || `telegram_${data.id}`,
        country: toIso2Server(userExist?.country || data?.country),
        provider: userExist?.provider || 'telegram',
        id_crossmint: userExist?.id_crossmint || '',
      });
      if (payload?.referral_id && payload.referral_id !== 'undefined') {
        const refData = await this.userService.findOne({
          _id: new Types.ObjectId(payload?.referral_id),
        });
        if (
          refData &&
          user._id?.toString() !== payload.referral_id?.toString()
        ) {
          await this.updatePoint({
            user_id: user._id.toString(),
            referral_id: payload.referral_id,
          });
        }
      }

      if (user?.disabled) {
        throw new Error('Your account has been disabled');
      }
      const accessToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase,
      });
      void this.customerIo.identify(user, { provider: 'telegram' });
      void this.customerIo.track(
        user._id.toString(),
        CIO_EVENTS.signup_completed,
        {
          provider: 'telegram',
          referral_id: payload?.referral_id || undefined,
        },
      );
      return {
        user,
        token: accessToken,
        is_new_user: true,
        auth_flow: 'register' as const,
      };
    } catch (error: any) {
      // Preserve UnauthorizedException so 401 reaches the client; wrap
      // anything else in a 401 too so we never leak DB/SDK details.
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Telegram login failed');
    }
  }

  async verifyTelegramAuth(data: any): Promise<boolean> {
    const { hash, ...payload } = data;

    const dataCheckString = Object.keys(payload)
      .sort()
      .map((key) => `${key}=${payload[key]}`)
      .join('\n');

    const secretKey = crypto
      .createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Constant-time compare prevents timing-side-channel hash recovery.
    if (typeof hash !== 'string' || hash.length !== computedHash.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex'),
    );
  }
  async signInAi(email: string) {
    try {
      if (!email) return null;
      return await this.userService.findOne({ email });
    } catch {
      // Caller (admin endpoint) only checks Boolean(user); avoid throwing
      // raw upstream errors that could leak internals.
      return null;
    }
  }

  async updatePoint(payload: { referral_id?: string; user_id: string }) {
    if (payload?.referral_id && payload.referral_id != 'null') {
      const point = await this.pointModel.findOne({
        user_id: new Types.ObjectId(payload.referral_id),
        referral_id: new Types.ObjectId(payload.user_id),
        type: 'add',
        action: 'referral',
      });
      if (!point) {
        const pointEntry = new this.pointModel({
          user_id: new Types.ObjectId(payload.referral_id),
          referral_id: new Types.ObjectId(payload.user_id),
          conversion_id: 0,
          point: 50,
          type: 'add',
          action: 'referral',
        });
        await pointEntry.save();
      }
    }
  }

  async getProfileByTelegramId(telegramId: string) {
    const res = await this.userService.findOne({
      id_telegram: telegramId,
    });
    return res;
  }
  async signOut(refreshToken: string) {
    const res = await axios.post(
      `${this.baseUrl}/signout`,
      { refreshToken },
      { headers: this.headers() },
    );
    return res.data;
  }

  async refresh(refreshToken: string) {
    const res = await axios.post(
      `${this.baseUrl}/refresh`,
      { refreshToken, projectId: this.projectId },
      { headers: this.headers() },
    );
    return res.data; // { accessToken, refreshToken }
  }

  async verifyPhone(token: string, id: string) {
    try {
      const user = await this.userService.findOne({
        _id: new Types.ObjectId(id),
      });
      if (!user) {
        throw new UnauthorizedException('user not found');
      }
      // console.log('token', token);
      // const admin = getAdminAuth();
      getAdminAuth();
      const decoded = await admin.auth().verifyIdToken(token); // const decoded = verifyIdToken(token);
      // console.log('decode', decoded);
      // console.log('user', user);
      const checkMobileDup = await this.userService.findOne({
        mobile: decoded.phone_number,
      });
      if (
        checkMobileDup &&
        checkMobileDup._id.toString() !== user._id.toString()
      ) {
        throw new UnauthorizedException('Mobile number already in use');
      }
      const userUpdate = await this.userService.update(user._id, {
        mobile: decoded.phone_number,
      });
      // console.log('userUpdate', userUpdate);

      return { uid: decoded.uid, user: userUpdate };
    } catch (error: any) {
      throw new UnauthorizedException(
        error?.message || 'Invalid Firebase token',
      );
    }
  }

  async generateToken(payload: { userId: string; firebaseId: string }) {
    const jwtSecret = process.env.JWT_SECRET;
    const token = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '1d',
    });

    return token;
  }

  /**
   * Issue a single-use SIWE nonce. The client embeds this in the EIP-4361
   * `Nonce:` field before signing; the server consumes (deletes) it on
   * verification. TTL on the collection prunes unused nonces after 5 min.
   */
  async issueSiweNonce(): Promise<{ nonce: string }> {
    // 16 random bytes → 32-char hex. EIP-4361 says nonce >= 8 chars alphanum.
    const nonce = crypto.randomBytes(16).toString('hex');
    await this.siweNonceModel.create({ nonce });
    return { nonce };
  }

  /**
   * MiniPay SIWE sign-in.
   *
   * Verifies an EIP-4361 signature recovers the claimed address, parses
   * `Issued At` out of the message body and rejects anything older than
   * 5 minutes, and atomically consumes the single-use `Nonce:` issued by
   * `issueSiweNonce` so replay of the same message+signature pair fails
   * the second time.
   *
   * On success, upserts a user keyed by a synthetic
   * `id_firebase = "minipay:<lowercase-address>"` so the existing `unique`
   * index on that field keeps holding and the `findOne` lookups in other
   * flows don't accidentally collide with real Firebase UIDs.
   *
   * Returns the same envelope shape as `signInFirebase` so the customer-app
   * NextAuth `minipay_siwe` branch consumes it uniformly.
   */
  async signInMiniPaySiwe(payload: MiniPaySiweDto) {
    const { address, message, signature, referral_id } = payload;

    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch {
      throw new UnauthorizedException('Invalid SIWE signature');
    }
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new UnauthorizedException('Signature does not match address');
    }

    // Pull `Issued At` out of the SIWE message (EIP-4361 field order is stable).
    const issuedAtMatch = /^Issued At:\s*(.+)$/m.exec(message);
    if (!issuedAtMatch) {
      throw new UnauthorizedException('Missing Issued At in SIWE message');
    }
    const issuedAt = new Date(issuedAtMatch[1].trim());
    if (Number.isNaN(issuedAt.getTime())) {
      throw new UnauthorizedException('Malformed Issued At in SIWE message');
    }
    const ageMs = Date.now() - issuedAt.getTime();
    // Accept 60 s of client clock skew; 5 min freshness window past that.
    if (ageMs < -60_000 || ageMs > 5 * 60_000) {
      throw new UnauthorizedException('SIWE message expired or in the future');
    }

    // Single-use nonce — atomically consume so replay of the same message
    // body+signature within the freshness window fails the second time.
    const nonceMatch = /^Nonce:\s*(\S+)/m.exec(message);
    if (!nonceMatch) {
      throw new UnauthorizedException('Missing Nonce in SIWE message');
    }
    const nonce = nonceMatch[1];
    const consumed = await this.siweNonceModel.findOneAndDelete({ nonce });
    if (!consumed) {
      throw new UnauthorizedException('Nonce invalid, expired, or already used');
    }

    const syntheticFirebaseId = `minipay:${address.toLowerCase()}`;
    const existing = (await this.userService.findOne({
      id_firebase: syntheticFirebaseId,
    })) as UserDocument | null;

    let user: UserDocument;
    let isNewUser: boolean;
    if (existing) {
      const updated = (await this.userService.update(existing._id, {
        address: address.toLowerCase(),
        provider: 'minipay',
      })) as UserDocument | null;
      if (!updated) {
        throw new UnauthorizedException('Failed to update wallet session');
      }
      if (updated.disabled) {
        throw new UnauthorizedException('Your account has been disabled');
      }
      user = updated;
      isNewUser = false;
    } else {
      const created = (await this.userService.createFromFirebase({
        address: address.toLowerCase(),
        id_crossmint: '',
        email: '',
        username: `MiniPay ${address.slice(0, 6)}…${address.slice(-4)}`,
        id_twitter: '',
        id_firebase: syntheticFirebaseId,
        country: '',
        provider: 'minipay',
      })) as UserDocument | null;
      if (!created) {
        throw new UnauthorizedException('Failed to provision wallet session');
      }
      if (created.disabled) {
        throw new UnauthorizedException('Your account has been disabled');
      }
      user = created;
      if (referral_id && referral_id !== 'undefined') {
        const ref = await this.userService.findOne({
          _id: new Types.ObjectId(referral_id),
        });
        if (ref && user._id?.toString() !== referral_id) {
          await this.updatePoint({
            user_id: user._id.toString(),
            referral_id,
          });
        }
      }
      isNewUser = true;
    }

    const token = await this.generateToken({
      userId: user._id.toString(),
      firebaseId: syntheticFirebaseId,
    });

    void this.customerIo.identify(user, { provider: 'minipay' });
    void this.customerIo.track(
      user._id.toString(),
      isNewUser ? CIO_EVENTS.signup_completed : CIO_EVENTS.login_completed,
      {
        provider: 'minipay',
        referral_id: isNewUser ? referral_id || undefined : undefined,
      },
    );

    return {
      user,
      token,
      is_new_user: isNewUser,
      auth_flow: (isNewUser ? 'register' : 'login') as 'register' | 'login',
    };
  }
}
