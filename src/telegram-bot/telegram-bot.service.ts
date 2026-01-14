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
  getLoginSession(telegramUserId: number): LoginSession | undefined {
    const session = this.cacheManager.get(
      `telegram_login_session_${telegramUserId}`,
    );
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
      '🔐 *Welcome to GogoCash Authentication*\n\n' +
        'Please select your preferred login method:\n\n' +
        '• Email - Login with your email address\n' +
        '• Mobile - Login with your phone number\n\n' +
        '_Session expires in 15 minutes_',
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
  generateAuthUrl(sessionId: string, loginType: string): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
    return `${baseUrl}/telegram-auth/verify?sessionId=${sessionId}&type=${loginType}`;
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
    const authUrl = this.generateAuthUrl(sessionId, loginType);

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
      [Markup.button.url('🚀 Open GogoCash App', url)],
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
      [Markup.button.url('🚀 Open GogoCash App', loginUrl)],
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
}
