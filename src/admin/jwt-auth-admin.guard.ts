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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('token not found');
    }
    const token = authHeader.substring(7);
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_ADMIN_SECRET,
      });
      request['user'] = decoded;
      return decoded;
    } catch (error: any) {
      // Don't log the error — repeated failed admin auth attempts can fill
      // logs with details that fingerprint the JWT library / secret format.
      throw new UnauthorizedException(error?.message || 'Invalid token');
    }
  }
}
