import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import { createCrossmint, CrossmintAuth } from '@crossmint/server-sdk';
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
  ) {
    this.baseUrl = this.config.get<string>('env.CROSSMINT_BASE_URL')!;
    this.projectId = this.config.get<string>('env.CROSSMINT_PROJECT_ID')!;
    this.secret = this.config.get<string>('env.CROSSMINT_SECRET')!;
    this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    this.crossmint = createCrossmint({
      apiKey: this.secret!,
    });
    this.crossmintAuth = CrossmintAuth.from(this.crossmint);
  }

  private headers() {
    return { Authorization: `Bearer ${this.secret}` };
  }

  async signUp(email: string, password: string) {
    console.log('this.baseUrl', this.baseUrl);
    const res = await axios.post(
      `${this.baseUrl}/signup`,
      { email, password, projectId: this.projectId },
      { headers: this.headers() },
    );
    return res.data;
  }

  async signIn(payload: SignInDto) {
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
  }

  async signInFirebase(token: string, payload: SignInFirebaseDto) {
    try {
      console.log('payload', payload);
      getAdminAuth();
      const data = await admin.auth().verifyIdToken(token);
      console.log('data', data);
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

      console.log('userExist', userExist);
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
          country: payload?.country ? payload?.country : '',
          provider: data?.firebase?.sign_in_provider,
        });
        if (user?.disabled) {
          throw new Error('Your account has been disabled');
        }
        const accessToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase,
        });
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
        country: payload?.country ? payload?.country : '',
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

      console.log('user', user);
      if (user?.disabled) {
        throw new Error('Your account has been disabled');
      }
      // Update points for referral if referral_id is provided
      // return user; // { accessToken, refreshToken, user }
      const accessToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase,
      });
      return {
        user,
        token: accessToken,
        is_new_user: true,
        auth_flow: 'register' as const,
      };
    } catch (error: any) {
      console.log('err', error);
      throw new Error(error?.message || 'Invalid Firebase token');
    }
  }

  async signInTelegram(payload: TelegramAuthDto) {
    try {
      console.log('payload', payload);
      // const check = await this.verifyTelegramAuth(payload);
      // console.log('data', check);
      // if (!check) {
      //   throw new Error('User not found in Telegram');
      // }
      // console.log('payload', data.id);
      const data = payload;

      let userExist = await this.userService.findOne({
        id_telegram: data.id.toString(),
      });

      if (!userExist && data.email) {
        userExist = await this.userService.findOne({
          email: data.email,
        });
      }

      console.log('userExist', userExist);
      if (userExist) {
        const user = await this.userService.update(userExist._id, {
          email: userExist?.email || data.email,
          username: userExist.username || data?.username || '',
          id_twitter: userExist?.id_twitter || '',
          id_telegram: data.id.toString(),
          address: userExist?.address || '',
          id_firebase: userExist?.id_firebase || `telegram_${data.id}`,
          country: userExist?.country || data?.country || '',
          provider: userExist?.provider || 'telegram',
        });
        if (user?.disabled) {
          throw new Error('Your account has been disabled');
        }
        const accessToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase,
        });
        console.log('accessToken', accessToken);
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
        country: userExist?.country || data?.country || '',
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

      console.log('user bb', user);
      if (user?.disabled) {
        throw new Error('Your account has been disabled');
      }
      // Update points for referral if referral_id is provided
      // return user; // { accessToken, refreshToken, user }
      const accessToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase,
      });
      return {
        user,
        token: accessToken,
        is_new_user: true,
        auth_flow: 'register' as const,
      };
    } catch (error: any) {
      console.log('err', error);
      throw new Error(error?.message || 'Invalid Firebase token');
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

    console.log('hmac', computedHash, 'hash', hash);

    return computedHash === hash;
  }
  async signInAi(email: string) {
    try {
      // console.log('payload', data.id);
      let user = null;
      if (email) {
        user = await this.userService.findOne({
          email: email,
        });
      }
      console.log('user', user);
      // Update points for referral if referral_id is provided
      return user; // { accessToken, refreshToken, user }
    } catch (error: any) {
      console.log('err', error);
      throw new Error(error?.message || 'Invalid Firebase token');
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
      // แนะนำ log error.message/error.code เพื่อ debug
      console.log('verifyIdToken error:', error);
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
   * MiniPay SIWE sign-in.
   *
   * Verifies an EIP-4361 signature recovers the claimed address, parses
   * `Issued At` out of the message body and rejects anything older than 5
   * minutes (replay mitigation — server-issued nonces are a follow-up).
   * On success, upserts a user keyed by a synthetic
   * `id_firebase = "minipay:<lowercase-address>"` so the existing
   * `unique` index on that field keeps holding and the `findOne` lookups
   * in other flows don't accidentally collide with real Firebase UIDs.
   *
   * Returns the same envelope shape as `signInFirebase` so the customer-app
   * NextAuth `minipay_siwe` branch consumes it uniformly.
   */
  /**
   * Issue a single-use SIWE nonce. The client embeds this in the EIP-4361
   * `Nonce:` field before signing; the server consumes (deletes) it on
   * verification. TTL on the collection prunes unused nonces after 5 min.
   */
  async issueSiweNonce(): Promise<{ nonce: string }> {
    // 16 random bytes → 32-char hex. EIP-4361 says nonce >= 8 chars alphanum.
    const nonce = crypto.randomBytes(16).toString('hex');
    await this.siweNonceModel.create({ nonce, issuedAt: new Date() });
    return { nonce };
  }

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
    const existing = await this.userService.findOne({
      id_firebase: syntheticFirebaseId,
    });

    let user: any;
    let isNewUser: boolean;
    if (existing) {
      user = await this.userService.update(existing._id, {
        address: address.toLowerCase(),
        provider: 'minipay',
      });
      if (user?.disabled) {
        throw new UnauthorizedException('Your account has been disabled');
      }
      isNewUser = false;
    } else {
      user = await this.userService.createFromFirebase({
        address: address.toLowerCase(),
        id_crossmint: '',
        email: '',
        username: `MiniPay ${address.slice(0, 6)}…${address.slice(-4)}`,
        id_twitter: '',
        id_firebase: syntheticFirebaseId,
        country: '',
        provider: 'minipay',
      });
      if (user?.disabled) {
        throw new UnauthorizedException('Your account has been disabled');
      }
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

    return {
      user,
      token,
      is_new_user: isNewUser,
      auth_flow: (isNewUser ? 'register' : 'login') as 'register' | 'login',
    };
  }
}
