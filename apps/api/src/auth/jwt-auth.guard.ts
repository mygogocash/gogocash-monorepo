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
      'This sign-in method is no longer available. Please sign in with your usual method.',
    );
  }
}
