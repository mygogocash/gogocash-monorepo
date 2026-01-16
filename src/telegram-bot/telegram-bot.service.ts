import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup } from 'telegraf';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

export type LoginType = 'email' | 'mobile' | 'password' | null;
interface LoginSession {
  telegramUserId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  timestamp: number;
  awaitingInput?: LoginType;
  email?: string;
  mobile?: string;
  isRegistration?: boolean;
}
//   private loginSessions: Map<number, LoginSession> = new Map();
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Generate a unique session ID for login flow
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store login session data
   */
  storeLoginSession(telegramUserId: number, data: LoginSession): void {
    // this.loginSessions.set(telegramUserId, data);
    this.cacheManager.set(
      `telegram_login_session_${telegramUserId}`,
      data,
      60 * 60, //1hr expiration time in seconds
    );
    setTimeout(
      () => {
        this.cacheManager.del(`telegram_login_session_${telegramUserId}`);
      },
      60 * 60 * 1000, //1hr expiration time in seconds
    );
  }

  /**
   * Get login session data
   */
  async getLoginSession(
    telegramUserId: number,
  ): Promise<LoginSession | undefined> {
    const session = await this.cacheManager.get(
      `telegram_login_session_${telegramUserId}`,
    );
    console.log('session >>', session);
    if (!session) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(session));
  }

  /**
   * Update login session
   */
  updateLoginSession(
    telegramUserId: number,
    updates: Partial<LoginSession>,
  ): void {
    const session = this.cacheManager.get(
      `telegram_login_session_${telegramUserId}`,
    );
    if (session) {
      this.cacheManager.set(`telegram_login_session_${telegramUserId}`, {
        ...session,
        ...updates,
      });
    }
  }

  /**
   * Delete login session
   */
  deleteLoginSession(telegramUserId: number): void {
    this.cacheManager.del(`telegram_login_session_${telegramUserId}`);
  }

  /**
   * Send login method selection
   */
  async sendLoginOptions(chatId: number): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📧 Login with Email', 'login_email')],
      [Markup.button.callback('📱 Login with Mobile', 'login_mobile')],
    ]);

    await this.bot.telegram.sendMessage(
      chatId,
      '🔐 *Login to GogoCash*\n\n' +
        'Please select your preferred login method:\n\n' +
        '• Email - Login with your email address\n' +
        '• Mobile - Login with your phone number\n\n' +
        '_Session expires in 1 hour_',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }

  /**
   * Send register method selection
   */
  async sendRegisterOptions(chatId: number): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📧 Register with Email', 'register_email')],
      [Markup.button.callback('📱 Register with Mobile', 'register_mobile')],
    ]);

    await this.bot.telegram.sendMessage(
      chatId,
      '🎉 *Create GogoCash Account*\n\n' +
        'Please select your preferred registration method:\n\n' +
        '• Email - Register with your email address\n' +
        '• Mobile - Register with your phone number\n\n' +
        "You'll be able to start earning cashback immediately!\n\n" +
        '_Session expires in 1 hour_',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }

  /**
   * Send prompt for email input
   */
  async promptForEmail(chatId: number): Promise<void> {
    await this.bot.telegram.sendMessage(
      chatId,
      '📧 *Email Login*\n\n' +
        'Please enter your email address:\n\n' +
        'Example: `user@example.com`\n\n' +
        '_Send /cancel to go back_',
      { parse_mode: 'Markdown' },
    );
  }

  /**
   * Send prompt for registration email
   */
  async promptForRegisterEmail(chatId: number): Promise<void> {
    await this.bot.telegram.sendMessage(
      chatId,
      '📧 *Register with Email*\n\n' +
        'Please enter your email address:\n\n' +
        'Example: `user@example.com`\n\n' +
        '_This will be your account identifier_\n' +
        '_Send /cancel to go back_',
      { parse_mode: 'Markdown' },
    );
  }

  /**
   * Send prompt for registration mobile
   */
  async promptForRegisterMobile(chatId: number): Promise<void> {
    await this.bot.telegram.sendMessage(
      chatId,
      '📱 *Register with Mobile*\n\n' +
        'Please enter your mobile number:\n\n' +
        'Example: `+1234567890` or click the button below\n\n' +
        '_This will be your account identifier_\n' +
        '_Send /cancel to go back_',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          Markup.button.contactRequest('📱 Share My Phone Number'),
        ]).resize(),
      },
    );
  }

  /**
   * Send prompt for mobile input
   */
  async promptForMobile(chatId: number): Promise<void> {
    await this.bot.telegram.sendMessage(
      chatId,
      '📱 *Mobile Login*\n\n' +
        'Please enter your mobile number:\n\n' +
        'Example: `+1234567890` or click the button below to share your phone number\n\n' +
        '_Send /cancel to go back_',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          Markup.button.contactRequest('📱 Share My Phone Number'),
        ]).resize(),
      },
    );
  }

  /**
   * Send prompt for password
   */
  async promptForPassword(chatId: number): Promise<void> {
    await this.bot.telegram.sendMessage(
      chatId,
      '🔑 *Enter Password*\n\n' +
        'Please enter your password:\n\n' +
        '_Your message will be deleted for security_\n' +
        '_Send /cancel to go back_',
      { parse_mode: 'Markdown' },
    );
  }

  /**
   * Generate authentication URL with session
   */
  generateAuthUrl(
    sessionId: string,
    loginType: string,
    telegramId: number,
  ): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
    return `${baseUrl}/telegram-auth/verify?sessionId=${sessionId}&type=${loginType}&telegramId=${telegramId}`;
  }

  /**
   * Send verification link to user
   */
  async sendVerificationLink(
    chatId: number,
    sessionId: string,
    loginType: string,
    identifier: string,
  ): Promise<void> {
    const authUrl = this.generateAuthUrl(sessionId, loginType, chatId);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('✅ Verify & Login', authUrl)],
    ]);

    await this.bot.telegram.sendMessage(
      chatId,
      '🔐 *Authentication Link*\n\n' +
        `Login Type: ${loginType === 'email' ? '📧 Email' : '📱 Mobile'}\n` +
        `${loginType === 'email' ? 'Email' : 'Mobile'}: \`${identifier}\`\n\n` +
        '👇 Click the button below to complete your login:\n\n' +
        '_This link expires in 15 minutes_',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }

  async openWebApp(chatId: number, url: string): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Open GogoCash App', url)],
    ]);

    await this.bot.telegram.sendMessage(
      chatId,
      '🌐 *Open GogoCash App*\n\n' +
        'Click the button below to open the GogoCash web application:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }

  /**
   * Send login token to user
   */
  async sendLoginToken(
    chatId: number,
    token: string,
    loginType: string,
    identifier: string,
  ): Promise<void> {
    const webAppUrl = process.env.WEB_APP_URL || 'https://app.gogocash.co';
    const loginUrl = `${webAppUrl}/auth/callback?token=${token}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Open GogoCash App', loginUrl)],
    ]);

    const message =
      '✅ *Authentication Successful!*\n\n' +
      `Login Method: ${loginType === 'email' ? '📧 Email' : '📱 Mobile'}\n` +
      `${loginType === 'email' ? 'Email' : 'Mobile'}: \`${identifier}\`\n\n` +
      '🎉 *Your Login Token:*\n' +
      `\`${token}\`\n\n` +
      '👇 Click the button below to open GogoCash app with your token:';

    await this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  }

  /**
   * Send error message to user
   */
  async sendError(chatId: number, error: string): Promise<void> {
    await this.bot.telegram.sendMessage(
      chatId,
      `❌ *Authentication Error*\n\n${error}\n\nPlease try again with /login command.`,
      { parse_mode: 'Markdown' },
    );
  }

  /**
   * Send success message
   */
  async sendMessage(chatId: number, message: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
    });
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateJwtToken(userData: any, loginType: string): string {
    const payload = {
      userId: userData.userId || userData._id?.toString(),
      email: userData.email,
      mobile: userData.mobile,
      telegramId: userData.telegramId,
      loginType: loginType,
      timestamp: Date.now(),
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate mobile format
   */
  isValidMobile(mobile: string): boolean {
    const mobileRegex = /^\+?[1-9]\d{1,14}$/;
    return mobileRegex.test(mobile.replace(/[\s-]/g, ''));
  }

  /**
   * Remove keyboard
   */
  async removeKeyboard(chatId: number): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, '✓', {
      reply_markup: { remove_keyboard: true },
    });
  }

  /**
   * Register new user via Telegram
   */
  async registerUser(
    email: string,
    mobile: string,
    telegramId: number,
    username?: string,
  ): Promise<any> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        $or: [{ email }, { mobile }],
      });

      if (existingUser) {
        throw new Error('User with this email or mobile already exists');
      }

      // Create user with Telegram ID as Firebase ID
      const firebaseId = `telegram_${telegramId}`;

      const newUser = await this.userModel.create({
        id_firebase: firebaseId,
        email: email || undefined,
        mobile: mobile || undefined,
        username: username || `user_${telegramId}`,
        provider: 'telegram',
        country: 'Thailand', // Default
      });

      this.logger.log(`User registered via Telegram: ${newUser._id}`);
      return newUser;
    } catch (error) {
      this.logger.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Login user via Telegram
   */
  async loginUser(identifier: string, isEmail: boolean): Promise<any> {
    try {
      const query = isEmail ? { email: identifier } : { mobile: identifier };
      const user = await this.userModel.findOne(query);

      if (!user) {
        throw new Error('User not found. Please register first.');
      }

      this.logger.log(`User logged in via Telegram: ${user._id}`);
      return user;
    } catch (error) {
      this.logger.error('Error logging in user:', error);
      throw error;
    }
  }

  /**
   * Send registration success message with token
   */
  async sendRegistrationSuccess(
    chatId: number,
    token: string,
    email?: string,
    mobile?: string,
  ): Promise<void> {
    const webAppUrl = process.env.WEB_APP_URL || 'https://app.gogocash.co';
    const loginUrl = `${webAppUrl}/auth/callback?token=${token}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Open GogoCash App', loginUrl)],
    ]);

    const identifier = email || mobile || '';
    const type = email ? '📧 Email' : '📱 Mobile';

    const message =
      '🎉 *Registration Successful!*\n\n' +
      `Your GogoCash account has been created!\n\n` +
      `${type}: \`${identifier}\`\n\n` +
      '🎁 *Your Login Token:*\n' +
      `\`${token}\`\n\n` +
      '👇 Click the button below to start earning cashback:';

    await this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  }
}
