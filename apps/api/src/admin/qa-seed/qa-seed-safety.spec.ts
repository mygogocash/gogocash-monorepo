import {
  QA_STAGING_CONFIRMATION,
  assertConnectedQaDatabase,
  assertQaSeedTarget,
} from './qa-seed-safety';

describe('QA admin matrix seed safety', () => {
  it('allows an explicit loopback database target', () => {
    expect(
      assertQaSeedTarget('mongodb://127.0.0.1:27017/gogocash-qa', {
        environment: 'local',
        expectedDatabase: 'gogocash-qa',
      }),
    ).toEqual(expect.objectContaining({ databaseName: 'gogocash-qa' }));
  });

  it('rejects a remote target disguised as local', () => {
    expect(() =>
      assertQaSeedTarget('mongodb://mongo.example.com:27017/gogocash', {
        environment: 'local',
        expectedDatabase: 'gogocash',
      }),
    ).toThrow(/loopback/i);
  });

  it('rejects staging without the explicit operation confirmation', () => {
    expect(() =>
      assertQaSeedTarget(
        'mongodb://mongo-staging.railway.internal:27017/test',
        {
          environment: 'staging',
          expectedDatabase: 'test',
        },
      ),
    ).toThrow(/confirmation/i);
  });

  it('allows only an explicitly named staging database', () => {
    expect(
      assertQaSeedTarget(
        'mongodb://mongo-staging.railway.internal:27017/test',
        {
          environment: 'staging',
          expectedDatabase: 'test',
          confirmation: QA_STAGING_CONFIRMATION,
          platformEnvironment: 'staging',
        },
      ),
    ).toEqual(expect.objectContaining({ databaseName: 'test' }));

    expect(() =>
      assertQaSeedTarget(
        'mongodb://mongo-staging.railway.internal:27017/production',
        {
          environment: 'staging',
          expectedDatabase: 'test',
          confirmation: QA_STAGING_CONFIRMATION,
        },
      ),
    ).toThrow(/expected database/i);
  });

  it('rejects a platform environment that contradicts staging', () => {
    expect(() =>
      assertQaSeedTarget(
        'mongodb://mongo-staging.railway.internal:27017/test',
        {
          environment: 'staging',
          expectedDatabase: 'test',
          confirmation: QA_STAGING_CONFIRMATION,
          platformEnvironment: 'production',
        },
      ),
    ).toThrow(/platform environment/i);
  });

  it('rejects a remote database host without a staging identity marker', () => {
    expect(() =>
      assertQaSeedTarget('mongodb://production-mongo.internal:27017/test', {
        environment: 'staging',
        expectedDatabase: 'test',
        confirmation: QA_STAGING_CONFIRMATION,
        platformEnvironment: 'staging',
      }),
    ).toThrow(/staging marker/i);
  });

  it('verifies the database reported after connection', () => {
    expect(() => assertConnectedQaDatabase('gogocash', 'test')).toThrow(
      /connected database/i,
    );
    expect(() => assertConnectedQaDatabase('test', 'test')).not.toThrow();
  });
});
