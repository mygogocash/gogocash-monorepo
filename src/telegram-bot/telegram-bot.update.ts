import { Injectable, Logger } from '@nestjs/common';
import { Update, Start, Help, Command, Ctx, On, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';

@Update()
@Injectable()
export class TelegramBotUpdate {
  private readonly logger = new Logger(TelegramBotUpdate.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    const userName = ctx.from?.first_name || 'there';
    await ctx.reply(
      `👋 Hello ${userName}! Welcome to GogoCash Bot!\n\n` +
        'Use /register to create a new account\n' +
        'Use /login to authenticate with your account\n' +
        'Use /help to see all available commands\n' +
        'Use /openapp to open the GogoCash web application',
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply(
      '📋 *Available Commands:*\n\n' +
        '/start - Start the bot\n' +
        '/register - Create a new account\n' +
        '/login - Login to your account\n' +
        '/openapp - Open the web app\n' +
        '/cancel - Cancel current operation\n' +
        '/help - Show this help message\n\n' +
        '🔐 Registration Flow:\n' +
        '1. Use /register command\n' +
        '2. Enter your email and details\n' +
        '3. Account created automatically\n' +
        '4. Receive your login token\n\n' +
        '🔑 Login Flow:\n' +
        '1. Use /login command\n' +
        '2. Enter your email or mobile\n' +
        '3. Receive your login token\n' +
        '4. Click link to open the app',
      { parse_mode: 'Markdown' },
    );
  }

  @Command('register')
  async onRegister(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) {
        await ctx.reply('❌ Unable to identify user. Please try again.');
        return;
      }

      // Initialize registration session
      this.telegramBotService.storeLoginSession(ctx.from.id, {
        telegramUserId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        timestamp: Date.now(),
        awaitingInput: null,
        isRegistration: true,
      });

      this.logger.log(
        `Registration initiated for user ${ctx.from.id} (${ctx.from.username})`,
      );

      // Send registration options
      await this.telegramBotService.sendRegisterOptions(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error in register command:', error);
      await ctx.reply(
        '❌ An error occurred while processing your registration. Please try again.',
      );
    }
  }

  @Command('login')
  async onLogin(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) {
        await ctx.reply('❌ Unable to identify user. Please try again.');
        return;
      }

      // Initialize login session
      this.telegramBotService.storeLoginSession(ctx.from.id, {
        telegramUserId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        timestamp: Date.now(),
        awaitingInput: null,
        isRegistration: false,
      });

      this.logger.log(
        `Login initiated for user ${ctx.from.id} (${ctx.from.username})`,
      );

      // Send login options
      await this.telegramBotService.sendLoginOptions(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error in login command:', error);
      await ctx.reply(
        '❌ An error occurred while processing your login request. Please try again.',
      );
    }
  }

  @Command('openapp')
  async onOpenApp(@Ctx() ctx: Context): Promise<void> {
    if (!ctx.from) {
      await ctx.reply('❌ Unable to identify user. Please try again.');
      return;
    }
    this.telegramBotService.openWebApp(
      ctx.chat.id,
      'https://f86c21bc4bdf.ngrok-free.app/login',
      // process.env.WEB_APP_URL || 'https://app.gogocash.co',
    );
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Context): Promise<void> {
    if (!ctx.from) return;

    const session = this.telegramBotService.getLoginSession(ctx.from.id);
    if (session) {
      this.telegramBotService.deleteLoginSession(ctx.from.id);
      await this.telegramBotService.removeKeyboard(ctx.chat.id);
      await ctx.reply('❌ Operation cancelled. Use /login to start again.', {
        reply_markup: { remove_keyboard: true },
      });
    } else {
      await ctx.reply('No active operation to cancel.');
    }
  }

  @Action('register_email')
  async onEmailRegister(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) return;

      await ctx.answerCbQuery();

      this.telegramBotService.updateLoginSession(ctx.from.id, {
        awaitingInput: 'email',
        isRegistration: true,
      });

      await this.telegramBotService.promptForRegisterEmail(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error in email registration:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  @Action('register_mobile')
  async onMobileRegister(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) return;

      await ctx.answerCbQuery();

      this.telegramBotService.updateLoginSession(ctx.from.id, {
        awaitingInput: 'mobile',
        isRegistration: true,
      });

      await this.telegramBotService.promptForRegisterMobile(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error in mobile registration:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  @Action('login_email')
  async onEmailLogin(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) return;

      await ctx.answerCbQuery();

      this.telegramBotService.updateLoginSession(ctx.from.id, {
        awaitingInput: 'email',
        isRegistration: false,
      });

      await this.telegramBotService.promptForEmail(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error in email login:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  @Action('login_mobile')
  async onMobileLogin(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) return;

      await ctx.answerCbQuery();

      this.telegramBotService.updateLoginSession(ctx.from.id, {
        awaitingInput: 'mobile',
        isRegistration: false,
      });

      await this.telegramBotService.promptForMobile(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error in mobile login:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  @On('contact')
  async onContact(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from || !('contact' in ctx.message)) return;

      const session = await this.telegramBotService.getLoginSession(
        ctx.from.id,
      );
      if (!session || session.awaitingInput !== 'mobile') {
        return;
      }

      const contact = ctx.message.contact;
      const phoneNumber = contact.phone_number;

      // Remove keyboard
      await this.telegramBotService.removeKeyboard(ctx.chat.id);

      // Check if this is registration or login
      if (session.isRegistration) {
        // Register new user
        try {
          const user = await this.telegramBotService.registerUser(
            '',
            phoneNumber,
            ctx.from.id,
            ctx.from.username,
          );

          // Generate token
          const token = this.telegramBotService.generateJwtToken(
            {
              userId: user._id.toString(),
              mobile: user.mobile,
              telegramId: ctx.from.id,
            },
            'mobile',
          );

          // Send success message with token
          await this.telegramBotService.sendRegistrationSuccess(
            ctx.chat.id,
            token,
            undefined,
            phoneNumber,
          );

          // Clean up session
          this.telegramBotService.deleteLoginSession(ctx.from.id);
        } catch (error) {
          this.logger.error('Error registering user:', error);
          await ctx.reply(
            `❌ Registration failed: ${error.message}\n\nPlease try again or use /login if you already have an account.`,
          );
        }
      } else {
        // Login existing user
        try {
          const user = await this.telegramBotService.loginUser(
            phoneNumber,
            false,
          );

          // Generate token
          const token = this.telegramBotService.generateJwtToken(
            {
              userId: user._id.toString(),
              email: user.email,
              mobile: user.mobile,
              telegramId: ctx.from.id,
            },
            'mobile',
          );

          // Send login token
          await this.telegramBotService.sendLoginToken(
            ctx.chat.id,
            token,
            'mobile',
            phoneNumber,
          );

          // Clean up session
          this.telegramBotService.deleteLoginSession(ctx.from.id);
        } catch (error) {
          this.logger.error('Error logging in user:', error);
          await ctx.reply(
            `❌ Login failed: ${error.message}\n\nPlease use /register if you don't have an account.`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error handling contact:', error);
      await ctx.reply(
        '❌ An error occurred. Please try again with /login or /register',
      );
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from || !('text' in ctx.message)) return;

      const text = ctx.message.text;

      // Ignore commands
      if (text.startsWith('/')) return;

      const session = await this.telegramBotService.getLoginSession(
        ctx.from.id,
      );
      console.log('session', session);
      if (!session) return;

      if (session.awaitingInput === 'email') {
        // Validate email
        if (!this.telegramBotService.isValidEmail(text)) {
          await ctx.reply(
            '❌ Invalid email format. Please enter a valid email address.',
          );
          return;
        }

        // Check if this is registration or login
        if (session.isRegistration) {
          // Register new user
          try {
            const user = await this.telegramBotService.registerUser(
              text,
              '',
              ctx.from.id,
              ctx.from.username,
            );

            // Generate token
            const token = this.telegramBotService.generateJwtToken(
              {
                userId: user._id.toString(),
                email: user.email,
                telegramId: ctx.from.id,
              },
              'email',
            );

            // Send success message with token
            await this.telegramBotService.sendRegistrationSuccess(
              ctx.chat.id,
              token,
              text,
            );

            // Clean up session
            this.telegramBotService.deleteLoginSession(ctx.from.id);
          } catch (error) {
            this.logger.error('Error registering user:', error);
            await ctx.reply(
              `❌ Registration failed: ${error.message}\n\nPlease try again or use /login if you already have an account.`,
            );
          }
        } else {
          // Login existing user
          try {
            const user = await this.telegramBotService.loginUser(text, true);

            // Generate token
            const token = this.telegramBotService.generateJwtToken(
              {
                userId: user._id.toString(),
                email: user.email,
                mobile: user.mobile,
                telegramId: ctx.from.id,
              },
              'email',
            );

            // Send login token
            await this.telegramBotService.sendLoginToken(
              ctx.chat.id,
              token,
              'email',
              text,
            );

            // Clean up session
            this.telegramBotService.deleteLoginSession(ctx.from.id);
          } catch (error) {
            this.logger.error('Error logging in user:', error);
            await ctx.reply(
              `❌ Login failed: ${error.message}\n\nPlease use /register if you don't have an account.`,
            );
          }
        }
      } else if (session.awaitingInput === 'mobile') {
        // Validate mobile
        const cleanMobile = text.replace(/[\s-]/g, '');
        if (!this.telegramBotService.isValidMobile(cleanMobile)) {
          await ctx.reply(
            '❌ Invalid mobile number format. Please enter a valid phone number with country code (e.g., +1234567890).',
          );
          return;
        }

        // Check if this is registration or login
        if (session.isRegistration) {
          // Register new user
          try {
            const user = await this.telegramBotService.registerUser(
              '',
              cleanMobile,
              ctx.from.id,
              ctx.from.username,
            );

            // Generate token
            const token = this.telegramBotService.generateJwtToken(
              {
                userId: user._id.toString(),
                mobile: user.mobile,
                telegramId: ctx.from.id,
              },
              'mobile',
            );

            // Send success message with token
            await this.telegramBotService.sendRegistrationSuccess(
              ctx.chat.id,
              token,
              undefined,
              cleanMobile,
            );

            // Clean up session
            this.telegramBotService.deleteLoginSession(ctx.from.id);
          } catch (error) {
            this.logger.error('Error registering user:', error);
            await ctx.reply(
              `❌ Registration failed: ${error.message}\n\nPlease try again or use /login if you already have an account.`,
            );
          }
        } else {
          // Login existing user
          try {
            const user = await this.telegramBotService.loginUser(
              cleanMobile,
              false,
            );

            // Generate token
            const token = this.telegramBotService.generateJwtToken(
              {
                userId: user._id.toString(),
                email: user.email,
                mobile: user.mobile,
                telegramId: ctx.from.id,
              },
              'mobile',
            );

            // Send login token
            await this.telegramBotService.sendLoginToken(
              ctx.chat.id,
              token,
              'mobile',
              cleanMobile,
            );

            // Clean up session
            this.telegramBotService.deleteLoginSession(ctx.from.id);
          } catch (error) {
            this.logger.error('Error logging in user:', error);
            await ctx.reply(
              `❌ Login failed: ${error.message}\n\nPlease use /register if you don't have an account.`,
            );
          }
        }
      } else if (session.awaitingInput === 'password') {
        // Delete the password message for security
        try {
          if ('message_id' in ctx.message) {
            await ctx.deleteMessage(ctx.message.message_id);
          }
        } catch {
          this.logger.warn('Could not delete password message');
        }

        // Generate session ID for verification
        const sessionId = this.telegramBotService.generateSessionId();
        const loginType = session.email ? 'email' : 'mobile';
        const identifier = session.email || session.mobile || '';

        // Store password temporarily (in production, verify immediately)
        this.telegramBotService.updateLoginSession(ctx.from.id, {
          awaitingInput: null,
        });

        // Send verification link
        await this.telegramBotService.sendVerificationLink(
          ctx.chat.id,
          sessionId,
          loginType,
          identifier,
        );

        this.logger.log(
          `Verification link sent to user ${ctx.from.id} for ${loginType}: ${identifier}`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling text message:', error);
      await ctx.reply('❌ An error occurred. Please try again with /login');
    }
  }
}
