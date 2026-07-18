import { UnauthorizedException } from '@nestjs/common';
import type { AdminRole } from '../user-admin/schemas/user-admin.schema';

export type AdminActor = Readonly<{
  id: string;
  label: string;
  role?: string;
}>;

type AdminJwtClaims = {
  sub?: unknown;
  username?: unknown;
  email?: unknown;
  role?: unknown;
};

const nonEmptyClaim = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * Resolve audit identity only from claims populated by AuthAdminGuard.
 * Mutations fail closed when a legacy/malformed token has no stable subject.
 */
export function requireAdminActor(request: unknown): AdminActor {
  const claims =
    typeof request === 'object' && request !== null && 'user' in request
      ? ((request as { user?: unknown }).user as AdminJwtClaims | undefined)
      : undefined;
  const id = nonEmptyClaim(claims?.sub);
  if (!id) {
    throw new UnauthorizedException(
      'Your admin session is missing an identity. Please sign in again.',
    );
  }

  const role = nonEmptyClaim(claims?.role) as AdminRole | undefined;

  return {
    id,
    label:
      nonEmptyClaim(claims?.username) ?? nonEmptyClaim(claims?.email) ?? id,
    ...(role ? { role } : {}),
  };
}
