/* eslint-disable prettier/prettier */
import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { SignInAiDto, SignInDto, SignInFirebaseDto } from './dto/auth.dto';
import { CrossmintAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
}
