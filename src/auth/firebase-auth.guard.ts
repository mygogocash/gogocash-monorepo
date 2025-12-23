// src/auth/firebase-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      // Verify the ID Token
      const decodedToken = await admin.auth().verifyIdToken(token);
      request['user'] = decodedToken; // Attach user info (uid, email, name) to request
      return true;
    } catch (error) {
      throw new UnauthorizedException(error?.message || 'Invalid token');
    }
  }
}
