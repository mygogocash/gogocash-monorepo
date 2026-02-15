// src/auth/firebase-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import * as admin from 'firebase-admin';
// import { getAdminAuth } from './firebase-admin.provider';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
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

    try {
      // // Verify the ID Token
      // getAdminAuth();
      // // forceRefresh: true จะช่วยให้ได้ Token ใหม่ที่ยังไม่หมดอายุ
      // const decodedToken = await admin.auth().verifyIdToken(token);
      // const user = await this.userModel.findOne({
      //   $or: [{ id_firebase: decodedToken.uid }, { email: decodedToken.email }],
      // });
      // if (!user) {
      //   throw new UnauthorizedException('User not found guard');
      // }
      // request['user'] = {
      //   ...decodedToken,
      //   sub: user._id,
      // }; // Attach user info (uid, email, name) to request

      // Validate JWT token and check if user is admin
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      // console.log(decoded);
      request['user'] = { ...decoded, sub: decoded.userId };
      // return decoded;
      return true;
    } catch (errorData: any) {
      throw new UnauthorizedException(errorData?.message || 'Invalid token');
    }
  }
}
