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
