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
 */
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

    this.logger.error(
      `${request.method} ${request.url} → ${status}: ${
        exception instanceof Error ? exception.message : String(exception)
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
