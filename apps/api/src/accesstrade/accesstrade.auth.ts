import { createHash, createHmac } from 'node:crypto';

/**
 * Accesstrade publisher auth is two-stage:
 *   1. Provision — GET /publishers/auth/{username} with an Authorization header
 *      = SHA256(username + ':' + MD5(password)) → returns { userUid, secretKey }.
 *   2. Per-call — an HS256 JWT { sub: userUid, iat } signed with that secretKey,
 *      sent as `Authorization: Bearer <jwt>` (+ `X-Accesstrade-User-Type`).
 *
 * Both builders are pure so the crypto (the part with no live-testable feedback
 * until a sandbox exists) is pinned against known vectors.
 *
 * `assumed`: the doc does not state the provisioning-hash encoding (hex vs
 * base64, case). This uses lowercase hex — MUST be confirmed against a live
 * `GET /publishers/auth/{email}` before trusting the flow.
 */
export function buildAccesstradeProvisioningAuth(
  username: string,
  password: string,
): string {
  const md5 = createHash('md5').update(password).digest('hex');
  return createHash('sha256').update(`${username}:${md5}`).digest('hex');
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export function buildAccesstradePublisherJwt(
  userUid: string,
  secretKey: string,
  iatSeconds: number,
): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ sub: userUid, iat: iatSeconds }));
  const signature = createHmac('sha256', secretKey)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}
