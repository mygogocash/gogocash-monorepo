import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
@Injectable()
export class AuthAdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    // console.log('authHeader', request.headers);
    // @TODO YUI GUARD ADMIN
    // console.log('headers', request);
    // const adminToken = request.headers['x-admin-token']; // ดึง Token จาก Header
    // console.log('adminToken', adminToken);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.substring(7);
    try {
      // Validate JWT token and check if user is admin
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_ADMIN_SECRET,
      });
      return decoded;
    } catch (error) {
      console.log('error', error);
      throw new UnauthorizedException(error.message || 'Invalid token');
    }
  }
}
