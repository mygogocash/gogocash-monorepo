// src/auth/firebase-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { verifyFirebaseIdToken } from './firebase-admin.provider';

type CachedDecode = { sub: string; firebaseId: string; expiresAt: number };

const FIREBASE_TOKEN_CACHE = new Map<string, CachedDecode>();
const FIREBASE_TOKEN_CACHE_TTL_MS = 60 * 1000;
const FIREBASE_TOKEN_CACHE_MAX = 5000;

const cacheGet = (key: string): CachedDecode | null => {
  const hit = FIREBASE_TOKEN_CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    FIREBASE_TOKEN_CACHE.delete(key);
    return null;
  }
  return hit;
};

const cacheSet = (key: string, value: CachedDecode): void => {
  if (FIREBASE_TOKEN_CACHE.size >= FIREBASE_TOKEN_CACHE_MAX) {
    const firstKey = FIREBASE_TOKEN_CACHE.keys().next().value;
    if (firstKey) FIREBASE_TOKEN_CACHE.delete(firstKey);
  }
  FIREBASE_TOKEN_CACHE.set(key, value);
};

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing token');
    }

    // Path 1: backend-issued JWT (existing behaviour, fast path).
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      request['user'] = { ...decoded, sub: decoded.userId };
      return true;
    } catch {
      // fall through to Firebase ID token verification
    }

    // Path 2: Firebase ID token. Auto-refreshed by Firebase SDK on the client,
    // so users no longer need to re-login when our backend JWT expires.
    try {
      const cached = cacheGet(token);
      if (cached) {
        request['user'] = {
          sub: cached.sub,
          userId: cached.sub,
          firebaseId: cached.firebaseId,
        };
        return true;
      }

      const decoded = await verifyFirebaseIdToken(token);
      // Email fallback only for VERIFIED emails (mirrors signInFirebase):
      // an unverified-email token carrying someone else's address must never
      // resolve to that victim's account.
      const emailFallback =
        decoded.email && decoded.email_verified === true
          ? [{ email: decoded.email }]
          : [];
      const user = await this.userModel
        .findOne(
          {
            $or: [{ id_firebase: decoded.uid }, ...emailFallback],
          },
          { _id: 1, id_firebase: 1 },
        )
        .lean();

      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (user.id_firebase && user.id_firebase !== decoded.uid) {
        this.logger.warn(
          `Firebase uid mismatch on email-fallback login: token uid ${decoded.uid} resolved user ${String(user._id)} (stored uid differs)`,
        );
      }

      const sub = String(user._id);
      cacheSet(token, {
        sub,
        firebaseId: decoded.uid,
        expiresAt: Date.now() + FIREBASE_TOKEN_CACHE_TTL_MS,
      });

      request['user'] = { sub, userId: sub, firebaseId: decoded.uid };
      return true;
    } catch (errorData: any) {
      // Keep the raw upstream reason in server logs; clients get generic copy.
      this.logger.warn(
        `Firebase token verification failed: ${errorData?.message ?? 'unknown error'}`,
      );
      throw new UnauthorizedException(
        'Your session has expired. Please sign in again.',
      );
    }
  }
}
