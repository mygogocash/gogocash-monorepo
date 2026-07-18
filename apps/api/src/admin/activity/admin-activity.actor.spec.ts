import { UnauthorizedException } from '@nestjs/common';
import { requireAdminActor } from './admin-activity.actor';

describe('requireAdminActor', () => {
  it('uses the verified JWT subject and stable human label', () => {
    const request = {
      user: {
        sub: 'admin-123',
        username: 'ops-admin',
        email: 'ops@gogocash.co',
      },
    };

    expect(requireAdminActor(request)).toEqual({
      id: 'admin-123',
      label: 'ops-admin',
    });
  });

  it('falls back to verified email for the label', () => {
    expect(
      requireAdminActor({
        user: { sub: 'admin-123', email: 'ops@gogocash.co' },
      }),
    ).toEqual({ id: 'admin-123', label: 'ops@gogocash.co' });
  });

  it('fails closed when the verified token has no stable subject', () => {
    expect(() =>
      requireAdminActor({ user: { email: 'ops@gogocash.co' } }),
    ).toThrow(UnauthorizedException);
  });
});
