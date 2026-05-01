/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  MiniPaySiweDto,
  SignInAiDto,
  SignInDto,
  SignInFirebaseDto,
  TelegramAuthDto,
} from './dto/auth.dto';
import { CrossmintAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimit } from './rate-limit.decorator';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly otpService: OtpService) {}

  @Post('sign-in')
  @UseGuards(CrossmintAuthGuard)
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
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInFirebase(token, body);
    return { message: 'Login successful!', ...user };
  }


  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: SignInFirebaseDto })
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async register(@Req() req: Request, @Body() body: SignInFirebaseDto) {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInFirebase(token, body);
    return { message: 'Login successful!', ...user };
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
    return user ? true : false;
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

  // Send-OTP: limited to discourage email-bombing the same address.
  @Post('send-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body('email') email: string) {
    return this.otpService.sendOtpToEmail(email);
  }

  // Verify-OTP: tight per-IP cap is the outer brake; per-email lockout
  // (3 wrong attempts → 30 min cooldown) lives in OtpService and prevents
  // 6-digit brute force regardless of rotating IPs.
  @Post('verify-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body('email') email: string, @Body('otp') otp: string) {
    return this.otpService.verifyOtpAndCreateToken(email, otp);
  }
}
