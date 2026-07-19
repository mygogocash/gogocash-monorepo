jest.mock('firebase-admin/app', () => ({
  applicationDefault: jest.fn(() => ({ type: 'adc' })),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}));

describe('getAdminAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('getAdminAuth > given FIREBASE_PROJECT_ID only > then initializes without ADC', () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.FIREBASE_PROJECT_ID = 'gogocash-staging';

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
    const adminApp = require('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
    const { getAdminAuth } = require('./firebase-admin.provider');

    getAdminAuth();

    expect(adminApp.initializeApp).toHaveBeenCalledWith({
      projectId: 'gogocash-staging',
    });
    expect(adminApp.applicationDefault).not.toHaveBeenCalled();
  });

  it('getAdminAuth > given GOOGLE_APPLICATION_CREDENTIALS > then initializes with ADC', () => {
    process.env.FIREBASE_PROJECT_ID = 'gogocash-staging';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/secrets/gcs-sa.json';

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
    const adminApp = require('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
    const { getAdminAuth } = require('./firebase-admin.provider');

    getAdminAuth();

    expect(adminApp.initializeApp).toHaveBeenCalledWith({
      projectId: 'gogocash-staging',
      credential: { type: 'adc' },
    });
    expect(adminApp.applicationDefault).toHaveBeenCalled();
  });

  describe('dual-project verification window (FIREBASE_SECONDARY_PROJECT_ID)', () => {
    const requireFresh = () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
      const adminApp = require('firebase-admin/app');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
      const adminAuth = require('firebase-admin/auth');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
      const provider = require('./firebase-admin.provider');
      // Named-app init must return an app handle (like the real SDK) so
      // getAuth(app) can route to the secondary project.
      adminApp.initializeApp.mockImplementation(
        (options: object, name?: string) => ({
          name: name ?? '[DEFAULT]',
          options,
        }),
      );
      return { adminApp, adminAuth, provider };
    };

    const wireAuths = (
      adminAuth: { getAuth: jest.Mock },
      primary: { verifyIdToken: jest.Mock },
      secondary: { verifyIdToken: jest.Mock },
    ) => {
      // getAuth() with no app = default (primary); with a named app = secondary.
      adminAuth.getAuth.mockImplementation((app?: { name: string }) =>
        app ? secondary : primary,
      );
    };

    it('verifyFirebaseIdToken > given the primary project verifies > then the secondary is never consulted', async () => {
      process.env.FIREBASE_PROJECT_ID = 'gogocash-7518f';
      process.env.FIREBASE_SECONDARY_PROJECT_ID = 'gogocash-staging';
      const { adminAuth, provider } = requireFresh();
      const primary = {
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'prod-uid' }),
      };
      const secondary = { verifyIdToken: jest.fn() };
      wireAuths(adminAuth, primary, secondary);

      await expect(provider.verifyFirebaseIdToken('tok')).resolves.toEqual({
        uid: 'prod-uid',
      });
      expect(secondary.verifyIdToken).not.toHaveBeenCalled();
    });

    it('verifyFirebaseIdToken > given primary rejects and a secondary is configured > then the secondary verdict is used', async () => {
      process.env.FIREBASE_PROJECT_ID = 'gogocash-7518f';
      process.env.FIREBASE_SECONDARY_PROJECT_ID = 'gogocash-staging';
      const { adminApp, adminAuth, provider } = requireFresh();
      const primary = {
        verifyIdToken: jest
          .fn()
          .mockRejectedValue(new Error('aud mismatch (staging token)')),
      };
      const secondary = {
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'staging-uid' }),
      };
      wireAuths(adminAuth, primary, secondary);

      await expect(provider.verifyFirebaseIdToken('tok')).resolves.toEqual({
        uid: 'staging-uid',
      });
      expect(adminApp.initializeApp).toHaveBeenCalledWith(
        { projectId: 'gogocash-staging' },
        expect.any(String),
      );
    });

    it('verifyFirebaseIdToken > given primary rejects and NO secondary configured > then the primary error propagates', async () => {
      process.env.FIREBASE_PROJECT_ID = 'gogocash-7518f';
      delete process.env.FIREBASE_SECONDARY_PROJECT_ID;
      const { adminAuth, provider } = requireFresh();
      const primary = {
        verifyIdToken: jest.fn().mockRejectedValue(new Error('aud mismatch')),
      };
      const secondary = { verifyIdToken: jest.fn() };
      wireAuths(adminAuth, primary, secondary);

      await expect(provider.verifyFirebaseIdToken('tok')).rejects.toThrow(
        'aud mismatch',
      );
      expect(secondary.verifyIdToken).not.toHaveBeenCalled();
    });

    it('verifyFirebaseIdToken > given BOTH projects reject > then the primary error (not the secondary one) propagates', async () => {
      process.env.FIREBASE_PROJECT_ID = 'gogocash-7518f';
      process.env.FIREBASE_SECONDARY_PROJECT_ID = 'gogocash-staging';
      const { adminAuth, provider } = requireFresh();
      const primary = {
        verifyIdToken: jest.fn().mockRejectedValue(new Error('primary-error')),
      };
      const secondary = {
        verifyIdToken: jest
          .fn()
          .mockRejectedValue(new Error('secondary-error')),
      };
      wireAuths(adminAuth, primary, secondary);

      await expect(provider.verifyFirebaseIdToken('tok')).rejects.toThrow(
        'primary-error',
      );
    });

    it('getSecondaryAdminAuth > given the secondary equals the primary > then no fallback app is created', () => {
      process.env.FIREBASE_PROJECT_ID = 'gogocash-7518f';
      process.env.FIREBASE_SECONDARY_PROJECT_ID = 'gogocash-7518f';
      const { provider } = requireFresh();

      expect(provider.getSecondaryAdminAuth()).toBeNull();
    });
  });

  it('getAdminAuth > given missing FIREBASE_PROJECT_ID > then throws before initializeApp', () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
    const adminApp = require('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs require
    const { getAdminAuth } = require('./firebase-admin.provider');

    expect(() => getAdminAuth()).toThrow(/FIREBASE_PROJECT_ID/);
    expect(adminApp.initializeApp).not.toHaveBeenCalled();
  });
});
