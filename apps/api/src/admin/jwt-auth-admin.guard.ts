import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { IS_PUBLIC_KEY } from './public.decorator';
import { USER_ADMIN_COLLECTION } from './user-admin/schemas/user-admin.schema';

type AdminTokenClaims = {
  sub?: unknown;
  email?: unknown;
  username?: unknown;
  role?: unknown;
  session_version?: unknown;
  [key: string]: unknown;
};

@Injectable()
export class AuthAdminGuard implements CanActivate {
  private readonly logger = new Logger(AuthAdminGuard.name);

  constructor(
    private jwtService: JwtService,
    private readonly reflector: Reflector,
    @InjectConnection() private readonly connection: Connection,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    let decoded: AdminTokenClaims;
    try {
      decoded = this.jwtService.verify<AdminTokenClaims>(token, {
        secret: process.env.JWT_ADMIN_SECRET,
      });
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

    const subject =
      typeof decoded.sub === 'string'
        ? decoded.sub.trim()
        : String(decoded.sub ?? '');
    if (!Types.ObjectId.isValid(subject)) {
      throw new UnauthorizedException(
        'Your admin session is no longer valid. Please sign in again.',
      );
    }

    let admin: {
      _id: Types.ObjectId;
      email?: string;
      username?: string;
      role?: string;
      session_version?: number;
    } | null;
    try {
      admin = await this.connection
        .collection<{
          _id: Types.ObjectId;
          email?: string;
          username?: string;
          role?: string;
          session_version?: number;
        }>(USER_ADMIN_COLLECTION)
        .findOne(
          { _id: new Types.ObjectId(subject) },
          {
            projection: {
              email: 1,
              username: 1,
              role: 1,
              session_version: 1,
            },
          },
        );
    } catch (error: unknown) {
      this.logger.error(
        `Admin session lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Admin session verification is temporarily unavailable.',
      );
    }
    if (!admin) {
      throw new UnauthorizedException(
        'Your admin session is no longer valid. Please sign in again.',
      );
    }

    const tokenSessionVersion = decoded.session_version ?? 0;
    const currentSessionVersion = admin.session_version ?? 0;
    if (
      typeof tokenSessionVersion !== 'number' ||
      !Number.isSafeInteger(tokenSessionVersion) ||
      tokenSessionVersion < 0 ||
      tokenSessionVersion !== currentSessionVersion
    ) {
      throw new UnauthorizedException(
        'Your admin session is no longer valid. Please sign in again.',
      );
    }

    // The database is authoritative. A role change or deletion takes effect on
    // the very next request even when the signed token has days left to live.
    request['user'] = {
      ...decoded,
      sub: String(admin._id),
      email: admin.email,
      username: admin.username,
      role: admin.role,
      session_version: currentSessionVersion,
    };
    return true;
  }
}
