import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import { createCrossmint, CrossmintAuth } from '@crossmint/server-sdk';
import { UserService } from 'src/user/user.service';
import {
  LineAuthDto,
  SignInDto,
  SignInFirebaseDto,
  TelegramAuthDto,
} from './dto/auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Point, PointDocument } from 'src/point/schemas/point.schema';
import { getAdminAuth } from './firebase-admin.provider';
import * as admin from 'firebase-admin';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { OtpService } from './otp.service';
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
    private readonly otpService: OtpService,
    @InjectModel(Point.name) private pointModel: Model<PointDocument>,
  ) {
    this.baseUrl = this.config.get<string>('env.CROSSMINT_BASE_URL')!;
    this.projectId = this.config.get<string>('env.CROSSMINT_PROJECT_ID')!;
    this.secret = this.config.get<string>('env.CROSSMINT_SECRET')!;
    this.httpsAgent = new https.Agent({ rejectUnauthorized: true });
    this.crossmint = createCrossmint({
      apiKey: this.secret!,
    });
    this.crossmintAuth = CrossmintAuth.from(this.crossmint);
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

      if (!userExist && data.phone_number) {
        userExist = await this.userService.findOne({
          mobile: data.phone_number,
        });
      }

      if (!userExist && data.mobile) {
        userExist = await this.userService.findOne({
          mobile: data.mobile,
        });
      }

      if (userExist) {
        const user = await this.userService.update(userExist._id, {
          email: userExist?.email || data.email,
          username: userExist?.username
            ? userExist?.username
            : data?.twitter
              ? data.twitter.username
              : data?.name || data?.email?.split('@')[0],
          id_twitter:
            userExist?.id_twitter || (data?.twitter ? data.twitter.id : ''),
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
        mobile: data?.phone_number ? data.phone_number : '',
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
      return { user, token: accessToken };
    } catch (error: any) {
      throw new Error(error?.message || 'Invalid Firebase token');
    }
  }

  async signInTelegram(payload: TelegramAuthDto) {
    try {
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
        return { user, token: accessToken };
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

      if (user?.disabled) {
        throw new Error('Your account has been disabled');
      }
      const accessToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase,
      });
      return { user, token: accessToken };
    } catch (error: any) {
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
      return user;
    } catch (error: any) {
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

  async getProfileByLineId(lineId: string) {
    const res = await this.userService.findOne({
      id_line: lineId,
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
   * Generate temporary token for OTP-verified email (5-minute expiry)
   * Used between OTP verification and final registration via /line-login
   */
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
    } catch (_error: any) {
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
      if (accessToken) {
        try {
          // First, verify the token is valid
          await this.verifyLineAccessToken(accessToken);

          // CRITICAL: Verify the token belongs to the claimed LINE user ID
          // This prevents attackers from using their valid token with someone else's LINE ID
          const lineProfile = await this.getLineProfile(accessToken);
          if (lineProfile.userId !== payload.id_line) {
            throw new Error(
              'LINE User ID mismatch - token does not belong to claimed user',
            );
          }
        } catch (verifyError: any) {
          throw new Error(verifyError?.message || 'Invalid LINE access token');
        }
      } else {
        throw new Error('LINE access token is required for authentication');
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
        // Update existing user - link LINE ID to account if not already linked
        const user = await this.userService.update(userExist._id, {
          username: userExist.username || payload.username,
          id_line: payload.id_line, // Link LINE ID to account
          provider: userExist.provider || 'line',
          email_verified: payload.email ? true : userExist.email_verified,
        });

        if (user?.disabled) {
          throw new Error('Your account has been disabled');
        }

        const jwtToken = await this.generateToken({
          userId: user._id.toString(),
          firebaseId: user.id_firebase || `line_${payload.id_line}`,
        });

        return { user, token: jwtToken };
      }

      // Create new user - frontend enforces email requirement
      const user = await this.userService.createFromFirebase({
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
      });

      // Handle referral
      if (payload?.referral_id && payload.referral_id !== 'undefined') {
        const refData = await this.userService.findOne({
          _id: new Types.ObjectId(payload.referral_id),
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

      const jwtToken = await this.generateToken({
        userId: user._id.toString(),
        firebaseId: user.id_firebase || `line_${payload.id_line}`,
      });

      return { user, token: jwtToken };
    } catch (error) {
      throw new Error(error?.message || 'LINE login failed');
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
    } catch (error) {
      throw new Error('Invalid LINE access token');
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
    } catch (error) {
      throw new Error('Failed to verify LINE user identity');
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
