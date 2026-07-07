/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  LineAuthDto,
  MiniPaySiweDto,
  RequestOtpDto,
  SignInAiDto,
  SignInDto,
  SignInFirebaseDto,
  TelegramAuthDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { Request } from 'express';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { OtpService } from './otp.service';
// VerifyOtpDto exists in BOTH auth.dto (email-OTP) and otp.dto (legacy) —
// alias the legacy one to disambiguate.
import {
  SendOtpDto,
  VerifyOtpDto as LegacyVerifyOtpDto,
} from './dto/otp.dto';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimit } from './rate-limit.decorator';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { EmailService } from '../email/email.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { extractAnalyticsContext } from 'src/analytics/analytics-context';

// Route-scoped strict validation for the UNAUTHENTICATED OTP endpoints. These
// take `email` straight into a Mongo selector (otp.service `findOne({ email })`),
// so a `{ $gt: "" }` object would be a NoSQL operator injection. `whitelist`
// strips unknown top-level props and the DTO's @IsEmail/@IsString rejects a
// non-string `email` with 400 before any DB call. Scoped to these routes (not a
// global pipe) on purpose: the codebase still has undecorated DTOs that a global
// whitelist pipe would silently empty — see PR#4 review C3/H1 (Phase 1 fix).
const otpBodyValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post('sign-in')
  @ApiBody({ type: SignInDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async login(@Body() body: SignInDto) {
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signIn(body);
    return { message: 'Login successful!', user };
  }

  @Post('log-in')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 20 })
  @ApiBody({ type: SignInFirebaseDto })
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async loginFirebase(@Req() req: Request, @Body() body: SignInFirebaseDto) {
    const authHeader = req.headers.authorization ?? "";
    // Prefer token from Authorization header, fallback to body.token for compatibility
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : body.token || null;

    if (!token) {
      throw new UnauthorizedException('Firebase token is required in Authorization header or body');
    }

    // Sign in the user
    const user = await this.auth.signInFirebase(token, body);

    // Track login event
    if (user.user?._id) {
      const analyticsCtx = extractAnalyticsContext(req, {
        userId: user.user._id.toString(),
        region: body.country,
      });

      void this.analytics.capture(
        'user_login',
        analyticsCtx,
        {
          method: 'firebase',
          provider: user.user.provider || 'unknown',
          is_new_user: user.is_new_user || false,
          pathname: body.pathname,
          $set: {
            email: user.user.email,
            username: user.user.username,
          },
        },
      );
    }

    return { message: 'Login successful!', ...user };
  }


  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: SignInFirebaseDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Req() req: Request, @Body() body: SignInFirebaseDto) {
    const authHeader = req.headers.authorization ?? "";
    // Prefer token from Authorization header, fallback to body.token for compatibility
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : body.token || null;

    if (!token) {
      throw new UnauthorizedException('Firebase token is required in Authorization header or body');
    }

    // Register/sign in the user
    const user = await this.auth.signInFirebase(token, body);

    // Track registration event
    if (user.user?._id) {
      const analyticsCtx = extractAnalyticsContext(req, {
        userId: user.user._id.toString(),
        region: body.country,
      });

      void this.analytics.capture(
        'user_registered',
        analyticsCtx,
        {
          method: 'firebase',
          provider: user.user.provider || 'unknown',
          pathname: body.pathname,
          referral_id: body.referral_id,
          $set: {
            email: user.user.email,
            username: user.user.username,
          },
        },
      );
    }

    return { message: 'Registration successful!', ...user };
  }

  /**
   * Issue a single-use SIWE nonce. Client fetches this before building the
   * EIP-4361 message. The nonce is consumed on `POST /auth/minipay-siwe` and
   * the collection has a 5-minute TTL so unused ones are pruned.
   */
  @Get('siwe-nonce')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 20 })
  @ApiResponse({ status: 200, description: 'SIWE nonce issued' })
  async siweNonce() {
    return this.auth.issueSiweNonce();
  }

  /**
   * MiniPay (Opera) mini-app SIWE sign-in. Accepts the EIP-4361 message body
   * and signature produced by MiniPay's injected wallet; the service verifies
   * the signature recovers the claimed address, upserts a user keyed by the
   * wallet, and returns the same envelope as the Firebase login endpoint.
   */
  @Post('minipay-siwe')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: MiniPaySiweDto })
  @ApiResponse({ status: 201, description: 'MiniPay SIWE login successful' })
  async loginMiniPaySiwe(@Body() body: MiniPaySiweDto) {
    const user = await this.auth.signInMiniPaySiwe(body);
    return { message: 'Login successful!', ...user };
  }

  @Post('log-in/telegram')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 20 })
  @ApiBody({ type: TelegramAuthDto })
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async loginTelegram(@Req() req: Request, @Body() body: TelegramAuthDto) {
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInTelegram(body);
    return { message: 'Login successful!', ...user };
  }

  /**
   * Account-existence probe for Telegram IDs. Admin-only to prevent
   * unauthenticated enumeration of which Telegram IDs have GoGoCash
   * accounts (which then feeds Telegram-login impersonation attacks).
   */
  @Get('check-account-telegram/:id')
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  async checkAccountTelegram(@Req() req: Request) {
    const id = req.params.id;
    const user = await this.auth.getProfileByTelegramId(id?.toString());
    return Boolean(user);
  }

  @Post("firebase")
  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  async authWithFirebase(@Req() req: Request, @Body() body: {idToken: string}) {
    const user = req['user'] as any;
    const id = user?.sub;
    // const authHeader = req.headers.authorization ?? "";
    // const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = body.idToken ? body.idToken : null;
    if (!token) throw new UnauthorizedException("Missing token");
    return this.auth.verifyPhone(token, id);
  }

  /**
   * Internal AI integration: lookup whether an email has an account.
   * Admin-only and only returns existence (no PII) to prevent unauthenticated
   * email enumeration / record dump.
   */
  @Post('log-in/ai')
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: SignInAiDto })
  @ApiResponse({ status: 201, description: 'Account existence check' })
  async loginAi(@Req() req: Request, @Body() body: SignInAiDto) {
    const user = await this.auth.signInAi(body.email);
    return { exists: Boolean(user) };
  }

  @Post('line-login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: LineAuthDto })
  @ApiResponse({ status: 201, description: 'LINE user login successfully' })
  async loginLine(@Req() req: Request, @Body() body: LineAuthDto) {
    // Extract LINE access token from Authorization header for verification
    const authHeader = req.headers.authorization ?? '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    // Extract temporary OTP token from custom header (set after email OTP verification)
    const tempToken = req.headers['x-otp-token'] as string | undefined;

    const result = await this.auth.signInLine(body, accessToken, tempToken);
    return { message: 'Login successful!', ...result };
  }

  @Get('check-account-line/:id')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 20 })
  @ApiResponse({ status: 200, description: 'Check if LINE account exists' })
  async checkAccountLine(@Req() req: Request) {
    const id = req.params.id;
    const user = await this.auth.getProfileByLineId(id?.toString());
    // SECURITY: Only return existence status and minimal data needed for login flow
    // Do not expose full user object to prevent data leakage
    return {
      exists: !!user,
      // Only return email hint if account exists (for UX - show which account to use)
      user: user ? {
        hasEmail: !!user.email && user.email !== '' && user.email !== 'undefined',
      } : null,
    };
  }

  @Post('email/request-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({ status: 201, description: 'OTP sent to email successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or rate limit exceeded' })
  async requestOtp(@Body(otpBodyValidation) body: RequestOtpDto) {
    // Generate and send OTP via email
    const otp = await this.otpService.createOtp(body.email);
    await this.emailService.sendOtp(body.email, otp);

    // SECURITY: Don't leak whether email exists in database
    return {
      message: 'If the email is valid, an OTP code has been sent.',
    };
  }

  @Post('email/verify-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified, temporary token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body(otpBodyValidation) body: VerifyOtpDto) {
    // STEP 1: Verify OTP code (business logic in OtpService)
    const isValid = await this.otpService.verifyOtp(body.email, body.otp);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // STEP 2: Generate temporary token (5 minutes) for registration
    // No auto-login — frontend uses this token with /line-login to complete signup
    const tempToken = await this.auth.generateTempToken(body.email);

    return {
      verified: true,
      message: 'Email verified successfully',
      temp_token: tempToken,
    };
  }

  // @Post('sign-out')
  // @ApiResponse({
  //   status: 200,
  //   description: 'Clear cookies and revoke refresh token',
  // })
  // async signOut(
  //   @Headers('cookie') cookie: string,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const refreshToken = this.extractTokenFromCookie(cookie, 'refresh_token');

  //   if (refreshToken) {
  //     await this.auth.signOut(refreshToken);
  //   }

  //   res.clearCookie('access_token');
  //   res.clearCookie('refresh_token');

  //   return { success: true };
  // }

  // private extractTokenFromCookie(
  //   cookieHeader: string | undefined,
  //   key: string,
  // ) {
  //   if (!cookieHeader) return null;
  //   const cookies = Object.fromEntries(
  //     cookieHeader.split(';').map((c) => c.trim().split('=')),
  //   );
  //   return cookies[key] || null;
  // }

  // Legacy email-OTP (UserOtp subsystem). Send-OTP: limited to discourage
  // email-bombing the same address.
  @Post('send-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body(otpBodyValidation) body: SendOtpDto) {
    return this.otpService.sendOtpToEmail(body.email);
  }

  // Verify-OTP: tight per-IP cap is the outer brake; per-email lockout
  // (3 wrong attempts → 30 min cooldown) lives in OtpService and prevents
  // 6-digit brute force regardless of rotating IPs.
  @Post('verify-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: LegacyVerifyOtpDto })
  async verifyLegacyOtp(@Body(otpBodyValidation) body: LegacyVerifyOtpDto) {
    return this.otpService.verifyOtpAndCreateToken(body.email, body.otp);
  }
}
