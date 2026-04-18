import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Minimal per-IP rate limiter for MVP use. In-memory, so per-instance only —
 * if the API is horizontally scaled, swap to a Redis-backed implementation
 * before this becomes the primary abuse defense.
 *
 * Applied via `@RateLimit({ windowMs, max })` on a route; falls back to the
 * defaults below when the decorator is omitted.
 */

export const RATE_LIMIT_KEY = 'rate-limit:config';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const DEFAULTS: RateLimitOptions = { windowMs: 60_000, max: 20 };

/**
 * Longest window this guard is expected to enforce across any route. Used
 * only for the opportunistic Map-cleanup threshold — not for rate-limit
 * decisions themselves. Entries older than this can safely be pruned even
 * for routes we haven't seen yet, because no live window could still be
 * referencing them.
 */
const MAX_TRACKED_WINDOW_MS = 60 * 60_000; // 1 h

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      route?: { path?: string };
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const opts =
      this.reflector.get<RateLimitOptions>(
        RATE_LIMIT_KEY,
        context.getHandler(),
      ) ?? DEFAULTS;

    const forwarded = req.headers?.['x-forwarded-for'];
    const fwd = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = (fwd?.split(',')[0]?.trim() || req.ip || 'unknown').toString();
    const routeKey = req.route?.path || context.getHandler().name;
    const key = `${routeKey}::${ip}`;

    const now = Date.now();
    const windowCutoff = now - opts.windowMs;
    const recent = (this.hits.get(key) ?? []).filter(
      (ts) => ts > windowCutoff,
    );

    if (recent.length >= opts.max) {
      this.logger.warn(`rate-limit hit ${key} (${recent.length}/${opts.max})`);
      throw new HttpException({ message: 'Too many requests' }, 429);
    }

    recent.push(now);
    this.hits.set(key, recent);

    // Opportunistic cleanup so the Map does not grow unbounded. Uses the
    // global MAX_TRACKED_WINDOW_MS (not `opts.windowMs`) as the cutoff so a
    // short-window route can't evict entries belonging to a longer-window
    // route that is still enforcing its limit.
    if (this.hits.size > 10_000) {
      const pruneCutoff = now - MAX_TRACKED_WINDOW_MS;
      for (const [k, arr] of this.hits.entries()) {
        if (arr[arr.length - 1] < pruneCutoff) this.hits.delete(k);
      }
    }

    return true;
  }
}
