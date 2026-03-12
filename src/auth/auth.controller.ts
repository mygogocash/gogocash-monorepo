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
  LineAuthDto,
  RequestOtpDto,
  SignInAiDto,
  SignInDto,
  SignInFirebaseDto,
  TelegramAuthDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { CrossmintAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { OtpService } from './otp.service';
<<<<<<< feat/line-miniapp
import { EmailService } from '../email/email.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { extractAnalyticsContext } from 'src/analytics/analytics-context';
=======
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
>>>>>>> feature/login-firebase

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
<<<<<<< feat/line-miniapp
  constructor(
    private readonly auth: AuthService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly analytics: AnalyticsService,
  ) {}
=======
  constructor(private readonly auth: AuthService, private readonly otpService: OtpService) {}
>>>>>>> feature/login-firebase

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
  @ApiBody({ type: SignInFirebaseDto })
  // @UseGuards(FirebaseAuthGuard)
  // @ApiSecurity('access-token') // Apply the security scheme defined globally
  // @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async loginFirebase(@Req() req: Request, @Body() body: SignInFirebaseDto) {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInFirebase(token, body);
    return { message: 'Login successful!', ...user };
  }


  @Post('register')
  @ApiBody({ type: SignInFirebaseDto })
  // @ApiSecurity('access-token') // Apply the security scheme defined globally
  // @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async register(@Req() req: Request, @Body() body: SignInFirebaseDto) {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInFirebase(token, body);
    return { message: 'Login successful!', ...user };
  }

  @Post('log-in/telegram')
  @ApiBody({ type: TelegramAuthDto })
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async loginTelegram(@Req() req: Request, @Body() body: TelegramAuthDto) {
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInTelegram(body);
    return { message: 'Login successful!', ...user };
  }

  @Get('check-account-telegram/:id')
  async checkAccountTelegram(@Req() req: Request) {
    const id = req.params.id;
    // The guard has already validated the token and added the user payload to the request
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

  @Post('log-in/ai')
  @ApiBody({ type: SignInAiDto })
  @ApiResponse({ status: 201, description: 'User login successfully' })
  async loginAi(@Req() req: Request, @Body() body: SignInAiDto) {
    // The guard has already validated the token and added the user payload to the request
    const user = await this.auth.signInAi(body.email);
    return { message: 'Login successful!', user };
  }

  @Post('line-login')
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
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({ status: 201, description: 'OTP sent to email successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or rate limit exceeded' })
  async requestOtp(@Body() body: RequestOtpDto) {
    // Generate and send OTP via email
    const otp = await this.otpService.createOtp(body.email);
    await this.emailService.sendOtp(body.email, otp);

    // SECURITY: Don't leak whether email exists in database
    return {
      message: 'If the email is valid, an OTP code has been sent.',
    };
  }

  @Post('email/verify-otp')
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified, temporary token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() body: VerifyOtpDto) {
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

  @Post('send-otp')
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body('email') email: string) {
    return this.otpService.sendOtpToEmail(email);
  }

  @Post('verify-otp')
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body('email') email: string, @Body('otp') otp: string) {
    return this.otpService.verifyOtpAndCreateToken(email, otp);
  }
}
