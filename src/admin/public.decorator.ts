import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'admin-route:public';

/**
 * Marks an admin route as public (no admin JWT required) — e.g. login and the
 * token-authenticated invite/reset endpoints. Required because `AuthAdminGuard`
 * is applied at the controller-class level so routes fail CLOSED by default;
 * `@Public()` is the explicit, auditable opt-out.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
