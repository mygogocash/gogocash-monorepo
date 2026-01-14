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
        'Use /login to authenticate with your email or mobile number.\n' +
        'Use /help to see all available commands. \n' +
        'Use /openapp to open the GogoCash web application.',
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply(
      '📋 *Available Commands:*\n\n' +
        '/start - Start the bot\n' +
        '/login - Authenticate with email or mobile\n' +
        '/cancel - Cancel current operation\n' +
        '/help - Show this help message\n\n' +
        '🔐 Authentication Flow:\n' +
        '1. Use /login command\n' +
        '2. Choose Email or Mobile login\n' +
        '3. Enter your credentials\n' +
        '4. Receive your login token\n' +
        '5. Click the link to open the app',
      { parse_mode: 'Markdown' },
    );
  }

  @Command('login')
  async onLogin(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) {
        await ctx.reply('❌ Unable to identify user. Please try again.');
        return;
      }

      // Initialize session
      this.telegramBotService.storeLoginSession(ctx.from.id, {
        telegramUserId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        timestamp: Date.now(),
        awaitingInput: null,
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
      process.env.WEB_APP_URL || 'https://app.gogocash.co',
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

  @Action('login_email')
  async onEmailLogin(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from) return;

      await ctx.answerCbQuery();

      this.telegramBotService.updateLoginSession(ctx.from.id, {
        awaitingInput: 'email',
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

      const session = this.telegramBotService.getLoginSession(ctx.from.id);
      if (!session || session.awaitingInput !== 'mobile') {
        return;
      }

      const contact = ctx.message.contact;
      const phoneNumber = contact.phone_number;

      // Remove keyboard
      await this.telegramBotService.removeKeyboard(ctx.chat.id);

      // Update session
      this.telegramBotService.updateLoginSession(ctx.from.id, {
        mobile: phoneNumber,
        awaitingInput: 'password',
      });

      await ctx.reply(`✓ Mobile number received: ${phoneNumber}`);
      await this.telegramBotService.promptForPassword(ctx.chat.id);
    } catch (error) {
      this.logger.error('Error handling contact:', error);
      await ctx.reply('❌ An error occurred. Please try again with /login');
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context): Promise<void> {
    try {
      if (!ctx.from || !('text' in ctx.message)) return;

      const text = ctx.message.text;

      // Ignore commands
      if (text.startsWith('/')) return;

      const session = this.telegramBotService.getLoginSession(ctx.from.id);
      if (!session) return;

      if (session.awaitingInput === 'email') {
        // Validate email
        if (!this.telegramBotService.isValidEmail(text)) {
          await ctx.reply(
            '❌ Invalid email format. Please enter a valid email address.',
          );
          return;
        }

        // Update session
        this.telegramBotService.updateLoginSession(ctx.from.id, {
          email: text,
          awaitingInput: 'password',
        });

        await ctx.reply(`✓ Email received: ${text}`);
        await this.telegramBotService.promptForPassword(ctx.chat.id);
      } else if (session.awaitingInput === 'mobile') {
        // Validate mobile
        const cleanMobile = text.replace(/[\s-]/g, '');
        if (!this.telegramBotService.isValidMobile(cleanMobile)) {
          await ctx.reply(
            '❌ Invalid mobile number format. Please enter a valid phone number with country code (e.g., +1234567890).',
          );
          return;
        }

        // Update session
        this.telegramBotService.updateLoginSession(ctx.from.id, {
          mobile: cleanMobile,
          awaitingInput: 'password',
        });

        await ctx.reply(`✓ Mobile number received: ${cleanMobile}`);
        await this.telegramBotService.promptForPassword(ctx.chat.id);
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
