import { EMAIL_RE } from './user-contact-otp.service';

/**
 * #540 — CodeQL js/polynomial-redos on the email validation regex. The old
 * `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` backtracks polynomially because `[^\s@]` also
 * matches '.', so the two quantifiers around `\.` are ambiguous. These tests pin
 * (a) that validation behaviour is preserved and (b) that a crafted input can no
 * longer blow up the matcher.
 */
describe('EMAIL_RE', () => {
  it('accepts valid email addresses', () => {
    for (const email of [
      'a@b.co',
      'user.name@example.com',
      'x@y.z.dev',
      'first+tag@sub.domain.io',
    ]) {
      expect(EMAIL_RE.test(email)).toBe(true);
    }
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['plain', 'a@b', '@b.co', 'a@.co', 'a@b.', 'a b@c.d']) {
      expect(EMAIL_RE.test(bad)).toBe(false);
    }
  });

  it('does not backtrack catastrophically on the CodeQL attack string', () => {
    // A near-match that fails at the very end (trailing space breaks `$`). The
    // ambiguous `[^\s@]+\.[^\s@]+` must try every split of the dots to confirm the
    // failure → O(n^2) on the old regex (hundreds of ms → seconds); the linear
    // regex rejects it in ~ms.
    const attack = 'a@' + 'a.'.repeat(20000) + ' ';
    const start = Date.now();
    const matched = EMAIL_RE.test(attack);
    const elapsedMs = Date.now() - start;

    expect(matched).toBe(false);
    expect(elapsedMs).toBeLessThan(100);
  }, 15000);
});
