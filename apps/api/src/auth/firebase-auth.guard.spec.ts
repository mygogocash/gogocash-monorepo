import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { verifyFirebaseIdToken } from './firebase-admin.provider';

jest.mock('./firebase-admin.provider', () => ({
  getAdminAuth: jest.fn(),
  verifyFirebaseIdToken: jest.fn(),
}));

type DecodedToken = {
  uid: string;
  email?: string;
  email_verified?: boolean;
};

describe('FirebaseAuthGuard (Firebase ID token path)', () => {
  const VICTIM_ID = '68bf99fed9667685c1637607';
  const VICTIM_EMAIL = 'victim@example.com';
  const VICTIM_UID = 'victim-firebase-uid';

  let verifyIdToken: jest.Mock;
  let findOne: jest.Mock;
  let guard: FirebaseAuthGuard;

  // The mock database holds ONE user: the victim, registered under
  // VICTIM_UID / VICTIM_EMAIL. It answers queries the way Mongo would:
  // a lookup matches only if the query's $or actually contains a clause
  // matching the victim's stored fields.
  const buildFindOne = () =>
    jest.fn().mockImplementation((query: Record<string, unknown>) => {
      const clauses = (query?.$or ?? []) as Record<string, unknown>[];
      const matches = clauses.some(
        (clause) =>
          clause.id_firebase === VICTIM_UID || clause.email === VICTIM_EMAIL,
      );
      return {
        lean: jest
          .fn()
          .mockResolvedValue(
            matches ? { _id: VICTIM_ID, id_firebase: VICTIM_UID } : null,
          ),
      };
    });

  const contextFor = (token: string) => {
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${token}` },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    verifyIdToken = verifyFirebaseIdToken as jest.Mock;
    verifyIdToken.mockReset();
    findOne = buildFindOne();
    const userModel = { findOne } as never;
    // JWT path always falls through so every test exercises the Firebase path.
    const jwtService = {
      verify: jest.fn(() => {
        throw new Error('not a backend JWT');
      }),
    } as never;
    guard = new FirebaseAuthGuard(userModel, jwtService);
  });

  it('given an UNVERIFIED-email token carrying the victim email > then rejects instead of resolving the victim account', async () => {
    const decoded: DecodedToken = {
      uid: 'attacker-uid',
      email: VICTIM_EMAIL,
      email_verified: false,
    };
    verifyIdToken.mockResolvedValue(decoded);
    const { context } = contextFor(`unverified-email-attack-${Date.now()}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('given a token with no email_verified claim at all > then the email fallback is not used', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'attacker-uid-2',
      email: VICTIM_EMAIL,
    } satisfies DecodedToken);
    const { context } = contextFor(`missing-claim-attack-${Date.now()}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('given a VERIFIED-email token > then resolves the user via the email fallback', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'new-project-uid',
      email: VICTIM_EMAIL,
      email_verified: true,
    } satisfies DecodedToken);
    const { context, request } = contextFor(`verified-email-${Date.now()}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { sub: string }).sub).toBe(VICTIM_ID);
  });

  it('given a uid match > then resolves regardless of email verification', async () => {
    verifyIdToken.mockResolvedValue({
      uid: VICTIM_UID,
      email: 'anything@else.com',
      email_verified: false,
    } satisfies DecodedToken);
    const { context, request } = contextFor(`uid-match-${Date.now()}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { sub: string }).sub).toBe(VICTIM_ID);
  });

  it('given a verified-email fallback where the token uid differs from the stored id_firebase > then logs a uid-mismatch warning', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'new-project-uid',
      email: VICTIM_EMAIL,
      email_verified: true,
    } satisfies DecodedToken);
    const warn = jest
      .spyOn(
        (guard as unknown as { logger: { warn: (msg: string) => void } })
          .logger,
        'warn',
      )
      .mockImplementation(() => undefined);
    const { context } = contextFor(`uid-mismatch-${Date.now()}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('uid mismatch'));
  });
});
