import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that returns a stable, sanitised error envelope
 * to clients while preserving full stack + context in server logs.
 *
 * Why: previously every controller wrapped errors with the upstream SDK
 * message (e.g. raw Mongoose / Firebase / Stripe errors), which leaks
 * library versions, query shapes, and sometimes internal IDs to attackers
 * probing endpoints. Clients now see a curated `{ statusCode, message }`
 * with a request id for support correlation.
 *
 * Structured passthrough: a small allowlist of APP-AUTHORED error codes may
 * additionally surface a curated `code` plus a numbers-only `reference_counts`
 * object, so deliberate domain errors (e.g. "category is referenced by N
 * offers") can drive UI without reopening the generic leak surface. Every
 * new code must be added here explicitly, and only numeric detail values pass.
 */

/** App-authored error codes whose `code` may reach the client. */
const ALLOWED_ERROR_CODES = new Set<string>(['POLICY_CATEGORY_REFERENCED']);

/** Only a flat object whose values are all finite numbers is surfaced. */
function safeReferenceCounts(
  value: unknown,
): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return undefined;
  const out: Record<string, number> = {};
  for (const [key, raw] of entries) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
    out[key] = raw;
  }
  return out;
}

@Catch()
export class SanitisedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SanitisedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Preserve HttpException messages (these are intentional, e.g. "Invalid
    // OTP", "Missing token") but never leak generic Error.message — those
    // come from upstream SDKs and may include internals.
    const safeMessage = (() => {
      if (exception instanceof HttpException) {
        const body = exception.getResponse();
        if (typeof body === 'string') return body;
        if (typeof body === 'object' && body !== null) {
          const m = (body as { message?: unknown }).message;
          if (typeof m === 'string') return m;
          if (Array.isArray(m)) return m.join(', ');
        }
        return exception.message || 'Request failed';
      }
      return 'Internal server error';
    })();

    // Curated structured passthrough for app-authored domain errors only.
    const structured = (() => {
      if (!(exception instanceof HttpException)) return {};
      const body = exception.getResponse();
      if (typeof body !== 'object' || body === null) return {};
      const code = (body as { code?: unknown }).code;
      if (typeof code !== 'string' || !ALLOWED_ERROR_CODES.has(code)) return {};
      const referenceCounts = safeReferenceCounts(
        (body as { reference_counts?: unknown }).reference_counts,
      );
      return {
        code,
        ...(referenceCounts ? { reference_counts: referenceCounts } : {}),
      };
    })();

    this.logger.error(
      `${request.method} ${request.url} → ${status}: ${
        exception instanceof Error ? exception.message : String(exception)
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      ...structured,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
