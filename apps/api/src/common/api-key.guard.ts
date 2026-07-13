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
 * Shared-secret guard for server-to-server / AI-integration endpoints (V-5:
 * POST /involve/create-affiliate-ai). The caller must send the configured key
 * in the `x-api-key` header.
 *
 * FAIL-CLOSED: if `INVOLVE_AI_API_KEY` is unset/empty, every request is
 * rejected — a deploy that forgets the secret leaves the route locked rather
 * than wide open (the original vulnerability). Comparison is constant-time to
 * avoid leaking the key via timing.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INVOLVE_AI_API_KEY;
    if (!expected || expected.length === 0) {
      // Fail closed but keep the real cause server-side; clients get generic copy.
      this.logger.error(
        'Request rejected: INVOLVE_AI_API_KEY is not configured.',
      );
      throw new UnauthorizedException({
        message:
          'This service is temporarily unavailable. Please try again later.',
      });
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header('x-api-key') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException({ message: 'Invalid API key' });
    }
    return true;
  }
}
