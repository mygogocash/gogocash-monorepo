import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Shared-secret guard for Involve Asia GET postbacks. The caller must send the
 * configured secret in the `token` query parameter.
 *
 * FAIL-CLOSED: if `INVOLVE_POSTBACK_SECRET` is unset/empty, every request is
 * rejected so an unconfigured deploy cannot accept unsigned postbacks.
 */
@Injectable()
export class InvolvePostbackTokenGuard implements CanActivate {
  private readonly logger = new Logger(InvolvePostbackTokenGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INVOLVE_POSTBACK_SECRET;
    if (!expected || expected.length === 0) {
      // Fail closed but keep the real cause server-side; clients get generic copy.
      this.logger.error(
        'Postback rejected: INVOLVE_POSTBACK_SECRET is not configured.',
      );
      throw new UnauthorizedException({
        message:
          'This service is temporarily unavailable. Please try again later.',
      });
    }

    const req = context.switchToHttp().getRequest<Request>();
    const tokenQuery = req.query.token;
    let provided = '';
    if (typeof tokenQuery === 'string') {
      provided = tokenQuery;
    } else if (Array.isArray(tokenQuery)) {
      const first = tokenQuery[0];
      provided = typeof first === 'string' ? first : '';
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException({ message: 'Invalid postback token' });
    }
    return true;
  }
}
