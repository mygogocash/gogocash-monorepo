import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from './public.decorator';
@Injectable()
export class AuthAdminGuard implements CanActivate {
  private readonly logger = new Logger(AuthAdminGuard.name);

  constructor(
    private jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Routes opt out of admin auth with @Public() (login, token-based
    // invite/reset). Applied here so the class-level guard fails CLOSED for
    // everything else.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    // console.log('authHeader', request.headers);
    // @TODO YUI GUARD ADMIN
    // console.log('headers', request);
    // const adminToken = request.headers['x-admin-token']; // ดึง Token จาก Header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('token not found');
    }
    const token = authHeader.substring(7);
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_ADMIN_SECRET,
      });
      request['user'] = decoded;
      return decoded;
    } catch (error: any) {
      // Client never sees the raw verify error (it could fingerprint the JWT
      // library / secret format). Keep the reason at debug level for ops
      // diagnosability without spamming default logs on repeated failures.
      this.logger.debug(
        `Admin token verification failed: ${error?.message ?? 'unknown error'}`,
      );
      throw new UnauthorizedException(
        'Your admin session has expired. Please sign in again.',
      );
    }
  }
}
