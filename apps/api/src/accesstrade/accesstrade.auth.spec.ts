import {
  buildAccesstradeProvisioningAuth,
  buildAccesstradePublisherJwt,
} from './accesstrade.auth';

describe('buildAccesstradeProvisioningAuth', () => {
  // Known vector computed independently (crypto): SHA256(user + ':' + MD5(pw)).
  // NOTE: the doc does not state hex-vs-base64 / case for this hash — this pins
  // the `assumed` lowercase-hex encoding, which must be confirmed live.
  it('is SHA256(username + ":" + MD5(password)) as lowercase hex', () => {
    expect(
      buildAccesstradeProvisioningAuth('pub@gogocash.co', 'secret123'),
    ).toBe(
      'dc67871944bb4f230098e93147e64d2b2eb7d2a8e268af30d79292a4829d6f2e',
    );
  });

  it('changes when either credential changes', () => {
    const base = buildAccesstradeProvisioningAuth('a@b.co', 'pw');
    expect(buildAccesstradeProvisioningAuth('a@b.co', 'pw2')).not.toBe(base);
    expect(buildAccesstradeProvisioningAuth('a2@b.co', 'pw')).not.toBe(base);
  });
});

describe('buildAccesstradePublisherJwt', () => {
  // Known vector: HS256 over {alg,typ}.{sub,iat} signed with the secretKey.
  it('builds an HS256 JWT with sub=userUid, iat, signed by secretKey', () => {
    expect(
      buildAccesstradePublisherJwt('uid-abc', 'secret-key-xyz', 1700000000),
    ).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1aWQtYWJjIiwiaWF0IjoxNzAwMDAwMDAwfQ.0kAyXIwP7OW7P1AmvbHRLKrYrQRTLxCQNTP_VQXenRc',
    );
  });

  it('produces a different signature under a different secretKey', () => {
    const a = buildAccesstradePublisherJwt('uid', 'k1', 1700000000);
    const b = buildAccesstradePublisherJwt('uid', 'k2', 1700000000);
    expect(a.split('.')[2]).not.toBe(b.split('.')[2]);
  });
});
