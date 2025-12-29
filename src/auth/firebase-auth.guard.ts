// src/auth/firebase-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getAdminAuth } from './firebase-admin.provider';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      // Verify the ID Token
      getAdminAuth();
      // forceRefresh: true จะช่วยให้ได้ Token ใหม่ที่ยังไม่หมดอายุ
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await this.userModel.findOne({
        id_firebase: decodedToken.uid,
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      request['user'] = { ...decodedToken, sub: user._id.toString() }; // Attach user info (uid, email, name) to request
      return true;
    } catch (errorData) {
      throw new UnauthorizedException(errorData?.message || 'Invalid token');
    }
  }
}
