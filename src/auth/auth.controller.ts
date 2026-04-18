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

  /**
   * MiniPay (Opera) mini-app SIWE sign-in. Accepts the EIP-4361 message body
   * and signature produced by MiniPay's injected wallet; the service verifies
   * the signature recovers the claimed address, upserts a user keyed by the
   * wallet, and returns the same envelope as the Firebase login endpoint.
   */
  @Post('minipay-siwe')
  @ApiBody({ type: MiniPaySiweDto })
  @ApiResponse({ status: 201, description: 'MiniPay SIWE login successful' })
  async loginMiniPaySiwe(@Body() body: MiniPaySiweDto) {
    const user = await this.auth.signInMiniPaySiwe(body);
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
