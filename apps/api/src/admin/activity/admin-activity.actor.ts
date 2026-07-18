import { UnauthorizedException } from '@nestjs/common';

export type AdminActor = Readonly<{
  id: string;
  label: string;
}>;

type AdminJwtClaims = {
  sub?: unknown;
  username?: unknown;
  email?: unknown;
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

  return {
    id,
    label:
      nonEmptyClaim(claims?.username) ?? nonEmptyClaim(claims?.email) ?? id,
  };
}
