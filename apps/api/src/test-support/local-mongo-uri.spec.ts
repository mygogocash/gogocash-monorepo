import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from './local-mongo-uri';

describe('optionalLocalMongoUri', () => {
  it.each([
    undefined,
    '',
    'not-a-uri',
    'mongodb+srv://cluster.example.com/gogocash',
    'mongodb://mongo-staging.railway.internal/gogocash',
    'mongodb://prod.example.com/gogocash',
  ])(
    'disables optional Mongo tests for absent, invalid, or hosted URI %p',
    (uri) => {
      expect(optionalLocalMongoUri(uri)).toBeUndefined();
    },
  );

  it.each([
    'mongodb://localhost:27019',
    'mongodb://127.0.0.1:27019/test',
    'mongodb://[::1]:27019/test',
  ])('accepts an explicit loopback test URI %s', (uri) => {
    expect(optionalLocalMongoUri(uri)).toBe(new URL(uri).toString());
  });

  it('replaces only the database path for an isolated suite database', () => {
    expect(
      localMongoDatabaseUri(
        'mongodb://127.0.0.1:27019/original?retryWrites=false',
        'isolated_339',
      ),
    ).toBe('mongodb://127.0.0.1:27019/isolated_339?retryWrites=false');
  });
});
