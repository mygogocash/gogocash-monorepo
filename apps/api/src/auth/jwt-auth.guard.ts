import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/** Legacy Crossmint guard — deprecated; always rejects. */
@Injectable()
export class CrossmintAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new UnauthorizedException(
      'Crossmint sign-in is disabled. Use /auth/log-in (Firebase) or /auth/minipay-siwe instead.',
    );
  }
}
