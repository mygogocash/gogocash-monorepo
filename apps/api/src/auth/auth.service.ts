import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserService } from 'src/user/user.service';
import {
  LineAuthDto,
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
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { SiweNonce, SiweNonceDocument } from './schemas/siwe-nonce.schema';
import { UserDocument } from 'src/user/schemas/user.schema';
import { toIso2Server } from 'src/utils/country';
import { AccountRegistrationService } from 'src/quest-task-engine/account-registration.service';
import { assertRegistrationSourceEnabled } from 'src/quest-task-engine/registration-source.manifest';

type FirebaseSignInOptions = {
  allowPhoneRegistration?: boolean;
};

function phoneLoginLookupCandidates(phoneE164: string): string[] {
  const thaiLegacyPhone = /^\+66\d{8,9}$/.test(phoneE164)
    ? `0${phoneE164.slice(3)}`
    : null;

  return thaiLegacyPhone ? [phoneE164, thaiLegacyPhone] : [phoneE164];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectModel(Point.name) private pointModel: Model<PointDocument>,
    @InjectModel(SiweNonce.name)
    private siweNonceModel: Model<SiweNonceDocument>,
    private readonly accountRegistration: AccountRegistrationService,
  ) {}

  async signIn(payload: SignInDto): Promise<never> {
    // Retained only so old clients fail closed instead of falling through to an
    // unverified identity path. Do not perform provider or database access.
    void payload;
    throw new UnauthorizedException(
      'This sign-in method is no longer available. Please sign in with your usual method.',
    );
  }

  async signInFirebase(
    token: string,
    payload: SignInFirebaseDto,
    options: FirebaseSignInOptions = {},
  ) {
    let data: Awaited<
      ReturnType<ReturnType<typeof getAdminAuth>['verifyIdToken']>
    >;
    try {
      data = await getAdminAuth().verifyIdToken(token);
    } catch (error: any) {
      this.logger.warn(
        `Firebase sign-in verification failed: ${error?.message ?? 'unknown error'}`,
      );
      throw new UnauthorizedException(
        "Your sign-in couldn't be verified. Please sign in again.",
      );
    }

    if (!data) {
      throw new UnauthorizedException(
        "Your sign-in couldn't be verified. Please sign in again.",
      );
    }

    try {
      const isPhoneSignIn = data.firebase?.sign_in_provider === 'phone';
      // console.log('payload', data.id);
      let userExist = await this.userService.findOne({
        id_firebase: data.uid,
      });
      if (!userExist && data.email && data.email_verified === true) {
        userExist = await this.userService.findOne({
          email: data.email,
        });
      }
      if (!userExist && data.phone_number) {
        userExist = await this.findUserByPhone(data.phone_number);
      }

      if (userExist) {
        if (userExist.disabled) {
          throw new ForbiddenException(
            'This account is disabled. Contact support.',
          );
        }

        // A verified phone is an additional sign-in method for an existing
        // account. Do not replace the original Firebase/social identity or
        // provider when the account was resolved by its linked phone number.
        const preserveOriginalIdentity =
          isPhoneSignIn && Boolean(userExist.id_firebase);

        // Firebase has already proved ownership of this E.164 number. Claim it
        // through the database's sparse unique index before issuing a session;
        // this closes the check-then-update race across API replicas and also
        // backfills legacy mobile-only accounts as they sign in.
        const verifiedPhoneUser =
          isPhoneSignIn && data.phone_number
            ? (await this.userService.claimVerifiedPhone(
                userExist._id,
                data.phone_number,
              )) || userExist
            : userExist;

        const user = await this.userService.update(verifiedPhoneUser._id, {
          email: verifiedPhoneUser?.email || data.email,
          username: verifiedPhoneUser?.username
            ? verifiedPhoneUser?.username
            : data?.twitter
              ? data.twitter.username
              : data?.name || data?.email?.split('@')[0],
          id_twitter:
            verifiedPhoneUser?.id_twitter ||
            (data?.twitter ? data.twitter.id : ''),
          address:
            payload?.address && payload?.address !== 'undefined'
              ? payload?.address
              : '',
          id_firebase: preserveOriginalIdentity
            ? verifiedPhoneUser.id_firebase
            : data.uid,
          country: toIso2Server(payload?.country),
          provider: preserveOriginalIdentity
            ? verifiedPhoneUser.provider || 'phone'
            : data?.firebase?.sign_in_provider,
        });
        if (user?.disabled) {
          throw new ForbiddenException(
            'This account is disabled. Contact support.',
          );
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

      if (isPhoneSignIn && options.allowPhoneRegistration !== true) {
        throw new UnauthorizedException({
          code: 'PHONE_LINK_REQUIRED',
          message:
            'This phone number is not linked to your GoGoCash account. Sign in with your original method, then link it from Profile.',
        });
      }

      const registrationSource = `firebase:${String(
        data.firebase?.sign_in_provider ?? '',
      )}`;
      // The registration-source policy is independent of the task-v2 rollout
      // flag. Existing accounts may continue to log in, but a newly verified
      // identity from an unlisted provider must fail closed in both modes.
      assertRegistrationSourceEnabled(registrationSource);

      const newUser = {
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
        mobile: data?.phone_number ? data.phone_number : '',
        ...(isPhoneSignIn && data.phone_number
          ? { verified_phone_e164: data.phone_number }
          : {}),
        provider: data?.firebase?.sign_in_provider,
      };
      const user = (
        await this.accountRegistration.registerVerified({
          source: registrationSource,
          user: newUser,
          referral_id: payload?.referral_id,
        })
      ).user as UserDocument;

      if (user?.disabled) {
        throw new ForbiddenException(
          'This account is disabled. Contact support.',
        );
      }
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
      if (error instanceof HttpException) throw error;

      // The identity token was already verified above, so failures here are
      // account-system failures rather than bad credentials.
      this.logger.error(
        `Firebase account sign-in failed: ${error?.message ?? 'unknown error'}`,
        error?.stack,
      );
      throw new InternalServerErrorException(
        "We couldn't finish signing you in. Please try again or contact support.",
      );
    }
  }

  async isPhoneLoginEligible(phoneE164: string): Promise<boolean> {
    const user = await this.findUserByPhone(phoneE164);
    return Boolean(user && user.disabled !== true);
  }

  private async findUserByPhone(phoneE164: string) {
    const canonicalUser = await this.userService.findOne({
      verified_phone_e164: phoneE164,
    });
    if (canonicalUser) return canonicalUser;

    for (const mobile of phoneLoginLookupCandidates(phoneE164)) {
      const user = await this.userService.findOne({ mobile });
      if (user) return user;
    }

    return null;
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
        return {
          user,
          token: accessToken,
          is_new_user: false,
          auth_flow: 'login' as const,
        };
      }
      assertRegistrationSourceEnabled('telegram');
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

  async getProfileByLineId(lineId: string) {
    const res = await this.userService.findOne({
      id_line: lineId,
    });
    return res;
  }

  async getProfileByTelegramId(telegramId: string) {
    const res = await this.userService.findOne({
      id_telegram: telegramId,
    });
    return res;
  }
  async verifyPhone(token: string, id: string) {
    let decoded: Awaited<
      ReturnType<ReturnType<typeof getAdminAuth>['verifyIdToken']>
    >;
    try {
      decoded = await getAdminAuth().verifyIdToken(token);
    } catch (error: any) {
      this.logger.warn(
        `Phone verification token failed: ${error?.message ?? 'unknown error'}`,
      );
      throw new UnauthorizedException(
        'Your phone verification expired. Request a new code and try again.',
      );
    }

    if (
      decoded.firebase?.sign_in_provider !== 'phone' ||
      typeof decoded.phone_number !== 'string' ||
      !/^\+[1-9]\d{7,14}$/.test(decoded.phone_number)
    ) {
      throw new BadRequestException(
        'Verify this phone number with a new code before linking it.',
      );
    }

    try {
      const user = await this.userService.findOne({
        _id: new Types.ObjectId(id),
      });
      if (!user) {
        throw new UnauthorizedException(
          'Your session has expired. Sign in again before linking a phone number.',
        );
      }

      const phoneOwner = await this.findUserByPhone(decoded.phone_number);
      if (phoneOwner && phoneOwner._id.toString() !== user._id.toString()) {
        throw new ConflictException(
          'This phone number is already linked to another account. Use a different number or contact support.',
        );
      }

      const userUpdate = await this.userService.claimVerifiedPhone(
        user._id,
        decoded.phone_number,
      );

      return { uid: decoded.uid, user: userUpdate };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Phone account linking failed: ${error?.message ?? 'unknown error'}`,
        error?.stack,
      );
      throw new InternalServerErrorException(
        "We couldn't link this phone number right now. Please try again or contact support.",
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
      throw new UnauthorizedException(
        "We couldn't verify your wallet. Please reconnect your wallet and try again.",
      );
    }
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new UnauthorizedException('Signature does not match address');
    }

    // EIP-4361 domain binding: a SIWE signature is only valid for the domain it
    // was issued for. Without this, a message the wallet signed for ANOTHER
    // site could be replayed here to authenticate that wallet. Enforced when
    // SIWE_EXPECTED_DOMAIN is configured (e.g. 'api.gogocash.co') so the control
    // ships without breaking the current MiniPay flow until the value is set.
    const expectedDomain = process.env.SIWE_EXPECTED_DOMAIN;
    if (expectedDomain) {
      const domainMatch = /^(\S+) wants you to sign in/m.exec(message);
      if (!domainMatch || domainMatch[1] !== expectedDomain) {
        throw new UnauthorizedException(
          "We couldn't verify your wallet sign-in. Please reconnect your wallet and try again.",
        );
      }
      const uriMatch = /^URI:\s*(\S+)/m.exec(message);
      let uriHost: string | null = null;
      try {
        uriHost = uriMatch ? new URL(uriMatch[1]).host : null;
      } catch {
        uriHost = null;
      }
      if (uriHost !== expectedDomain) {
        throw new UnauthorizedException('SIWE URI mismatch');
      }
    }

    // Pull `Issued At` out of the SIWE message (EIP-4361 field order is stable).
    const issuedAtMatch = /^Issued At:\s*(\S+)/m.exec(message.slice(0, 4096));
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
      throw new UnauthorizedException(
        'Your wallet sign-in request expired. Please reconnect your wallet and try again.',
      );
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
      throw new UnauthorizedException(
        'Nonce invalid, expired, or already used',
      );
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
      assertRegistrationSourceEnabled('minipay_siwe');
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

    return {
      user,
      token,
      is_new_user: isNewUser,
      auth_flow: (isNewUser ? 'register' : 'login') as 'register' | 'login',
    };
  }

  async generateTempToken(email: string): Promise<string> {
    const payload = {
      email: email,
      type: 'otp_verified',
    };

    const token = this.jwtService.sign(payload, {
      secret: this.config.get<string>('env.JWT_SECRET'),
      expiresIn: '5m',
    });

    return token;
  }

  /**
   * Verify temporary token (used by /line-login)
   * Returns the email from the token payload
   */
  async verifyTempToken(token: string): Promise<{ email: string }> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.config.get<string>('env.JWT_SECRET'),
      });

      if (decoded.type !== 'otp_verified') {
        throw new Error('Invalid token type');
      }

      return { email: decoded.email };
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }
  }

  /**
   * Sign in with LINE credentials from LIFF
   * This method handles LINE Mini App authentication
   * @param payload - LINE auth data (id_line, email, username, etc.)
   * @param accessToken - Optional LINE access token for verification
   * @param tempToken - Optional temporary OTP token (required when email is provided)
   */
  async signInLine(
    payload: LineAuthDto,
    accessToken?: string,
    tempToken?: string,
  ) {
    try {
      // STEP 0: Verify LINE access token and user identity
      // CRITICAL: Must verify token belongs to the claimed user ID
      if (!accessToken) {
        throw new UnauthorizedException(
          'Your LINE sign-in session is missing. Start LINE sign-in again.',
        );
      }

      // First, verify the token is valid and was issued for GoGoCash's
      // environment-specific LINE Login channel. A token from another LINE
      // channel is valid LINE identity, but not valid GoGoCash identity.
      const verifiedLineToken = await this.verifyLineAccessToken(accessToken);
      const expectedLineChannelId = this.config
        .get<string>('env.LINE_CHANNEL_ID')
        ?.trim();
      if (!expectedLineChannelId) {
        throw new ServiceUnavailableException(
          'LINE sign-in is not configured. Please try another sign-in method.',
        );
      }
      if (verifiedLineToken?.client_id !== expectedLineChannelId) {
        throw new UnauthorizedException(
          "We couldn't verify this LINE sign-in session. Start LINE sign-in again.",
        );
      }

      // CRITICAL: Verify the token belongs to the claimed LINE user ID.
      // This prevents attackers from using their valid token with someone else's LINE ID.
      const lineProfile = await this.getLineProfile(accessToken);
      if (lineProfile.userId !== payload.id_line) {
        throw new UnauthorizedException(
          "We couldn't verify this LINE account. Start LINE sign-in again.",
        );
      }

      // STEP 1: Verify temporary OTP token if email is provided
      // This ensures the user has completed OTP verification before linking email
      if (payload.email) {
        if (!tempToken) {
          throw new BadRequestException(
            'Email verification token required. Please complete OTP verification first.',
          );
        }

        try {
          const tokenData = await this.verifyTempToken(tempToken);

          // Verify email in payload matches the verified email in token
          if (tokenData.email !== payload.email) {
            throw new BadRequestException(
              'Email mismatch in verification token',
            );
          }
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(
            'Invalid or expired email verification. Please verify OTP again.',
          );
        }
      }

      // Find existing user by LINE User ID
      let userExist = await this.userService.findOne({
        id_line: payload.id_line,
      });

      // If not found by LINE ID, try to find by email (for account linking)
      // This allows users to link their LINE account to an existing email account
      // SECURITY: Token verification above ensures the LINE user is legitimate
      if (!userExist && payload.email) {
        userExist = await this.userService.findOne({
          email: payload.email,
        });
      }

      if (userExist) {
        if (userExist.disabled) {
          throw new ForbiddenException(
            'This account is disabled. Contact support.',
          );
        }

        // Update existing user - link LINE ID to account if not already linked
        const user = await this.userService.update(userExist._id, {
          username: userExist.username || payload.username,
          id_line: payload.id_line, // Link LINE ID to account
          // Backend JWTs are bound to both the Mongo user id and this identity
          // by FirebaseAuthGuard. Persist the same synthetic value used in the
          // JWT for legacy LINE rows that predate id_firebase population.
          id_firebase: userExist.id_firebase || `line_${payload.id_line}`,
          provider: userExist.provider || 'line',
          email_verified: payload.email ? true : userExist.email_verified,
          // Keep the LINE profile photo when the account has none yet.
          ...(payload.picture_url && !userExist.avatar_url
            ? { avatar_url: payload.picture_url }
            : {}),
        });

        if (user?.disabled) {
          throw new ForbiddenException(
            'This account is disabled. Contact support.',
          );
        }

        const jwtToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase || `line_${payload.id_line}`,
        });

        return { user, token: jwtToken };
      }

      // Create new user - frontend enforces email requirement
      const newUser = {
        email: payload.email,
        username: payload.username || 'LINE User',
        id_line: payload.id_line,
        id_firebase: `line_${payload.id_line}`,
        country: payload.country || 'TH',
        provider: 'line',
        address: '',
        id_crossmint: '',
        id_twitter: '',
        email_verified: !!payload.email,
        ...(payload.picture_url ? { avatar_url: payload.picture_url } : {}),
      };
      const user = (
        await this.accountRegistration.registerVerified({
          source: 'line',
          user: newUser,
          referral_id: payload.referral_id,
        })
      ).user as UserDocument;

      if (user?.disabled) {
        throw new ForbiddenException(
          'This account is disabled. Contact support.',
        );
      }

      const jwtToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase || `line_${payload.id_line}`,
      });

      return { user, token: jwtToken };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `LINE account sign-in failed: ${error?.message ?? 'unknown error'}`,
        error?.stack,
      );
      throw new InternalServerErrorException(
        "We couldn't finish LINE sign-in. Try another sign-in method or contact support.",
      );
    }
  }

  /**
   * Verify LINE access token with LINE API
   * Returns: { scope, client_id, expires_in }
   */
  private async verifyLineAccessToken(accessToken: string) {
    try {
      const response = await axios.get(
        'https://api.line.me/oauth2/v2.1/verify',
        {
          params: { access_token: accessToken },
        },
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 401) {
        throw new UnauthorizedException(
          'Your LINE sign-in session expired. Start LINE sign-in again.',
        );
      }
      throw new BadGatewayException(
        'LINE sign-in is temporarily unavailable. Please try again later.',
      );
    }
  }

  /**
   * Get LINE user profile using access token
   * CRITICAL: Used to verify the token belongs to the claimed user ID
   * Returns: { userId, displayName, pictureUrl?, statusMessage? }
   */
  private async getLineProfile(accessToken: string) {
    try {
      const response = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 401) {
        throw new UnauthorizedException(
          'Your LINE sign-in session expired. Start LINE sign-in again.',
        );
      }
      throw new BadGatewayException(
        'LINE sign-in is temporarily unavailable. Please try again later.',
      );
    }
  }

  /**
   * Sign in with Email OTP verification
   * This method handles email-based authentication after OTP verification
   * @param email - User's verified email address
   * @returns Object with user and JWT access token
   */
  async signInWithEmailOtp(
    email: string,
  ): Promise<{ user: any; token: string }> {
    try {
      // Find existing user by email
      const userExist = await this.userService.findOne({
        email: email,
      });

      if (userExist) {
        // Update existing user - mark email as verified
        const user = await this.userService.update(userExist._id, {
          email_verified: true,
          provider: userExist.provider || 'email',
        });

        if (user?.disabled) {
          throw new Error('Your account has been disabled');
        }

        const accessToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase || `email_${email}`,
        });

        return { user, token: accessToken };
      }

      assertRegistrationSourceEnabled('email_otp');

      // Create new user - email already verified via OTP
      const user = await this.userService.createFromFirebase({
        email: email,
        username: email.split('@')[0], // Use email prefix as username
        id_firebase: `email_${email}`, // Generate unique firebase ID
        country: '',
        provider: 'email',
        address: '',
        id_crossmint: '',
        id_twitter: '',
      });

      if (user?.disabled) {
        throw new Error('Your account has been disabled');
      }

      const accessToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase || `email_${email}`,
      });

      return { user, token: accessToken };
    } catch (error) {
      throw new Error(error?.message || 'Email OTP login failed');
    }
  }
}
