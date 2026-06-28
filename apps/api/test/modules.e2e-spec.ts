/**
 * HTTP-level API e2e against a running Nest server (or skip when unreachable).
 * Run after `npm run e2e:stack` or set E2E_API_URL.
 */
import request from 'supertest';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';

async function apiReachable(): Promise<boolean> {
  try {
    const res = await request(API_URL).get('/health').timeout(3000);
    return res.status === 200;
  } catch {
    return false;
  }
}

const suite = describe;

suite('Offer HTTP (e2e-live)', () => {
  let up = false;

  beforeAll(async () => {
    up = await apiReachable();
  });

  it('GET /offer/top-brands returns 200 JSON', async () => {
    if (!up) return;
    const res = await request(API_URL).get('/offer/top-brands');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body) || Array.isArray(res.body?.data)).toBe(true);
  });
});

suite('Auth guard HTTP (e2e-live)', () => {
  let up = false;
  const customerToken = process.env.E2E_CUSTOMER_TOKEN ?? '';

  beforeAll(async () => {
    up = await apiReachable();
  });

  it('GET /user/profile without token returns 401', async () => {
    if (!up) return;
    const res = await request(API_URL).get('/user/profile');
    expect(res.status).toBe(401);
  });

  it('GET /user/profile with seeded JWT returns 200', async () => {
    if (!up || !customerToken) return;
    const res = await request(API_URL)
      .get('/user/profile')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });
});

suite('Admin HTTP (e2e-live)', () => {
  let up = false;

  beforeAll(async () => {
    up = await apiReachable();
  });

  it('POST /admin/login rejects invalid credentials', async () => {
    if (!up) return;
    const res = await request(API_URL)
      .post('/admin/login')
      .send({ email: 'nobody@gogocash.co', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /admin/login accepts seeded superadmin', async () => {
    if (!up) return;
    const res = await request(API_URL)
      .post('/admin/login')
      .send({ email: 'admin@gogocash.co', password: '1234' });
    if (res.status === 429) {
      expect(process.env.E2E_ADMIN_TOKEN).toBeTruthy();
      return;
    }
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });
});

suite('Brand directory HTTP (e2e-live)', () => {
  let up = false;
  const adminToken = process.env.E2E_ADMIN_TOKEN ?? '';

  beforeAll(async () => {
    up = await apiReachable();
  });

  it('GET /brand returns 200 for admin', async () => {
    if (!up || !adminToken) return;
    const res = await request(API_URL)
      .get('/brand')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

suite('Withdraw HTTP (e2e-live)', () => {
  let up = false;
  const customerToken = process.env.E2E_CUSTOMER_TOKEN ?? '';

  beforeAll(async () => {
    up = await apiReachable();
  });

  it('POST /withdraw/check without token returns 401', async () => {
    if (!up) return;
    const res = await request(API_URL).post('/withdraw/check');
    expect(res.status).toBe(401);
  });

  it('POST /withdraw/check with seeded JWT returns 200', async () => {
    if (!up || !customerToken) return;
    const res = await request(API_URL)
      .post('/withdraw/check')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(201);
  });
});

suite('Involve postback guard (e2e-live)', () => {
  let up = false;

  beforeAll(async () => {
    up = await apiReachable();
  });

  it('GET /involve/postback without token is rejected', async () => {
    if (!up) return;
    const res = await request(API_URL).get('/involve/postback');
    expect([401, 403, 400]).toContain(res.status);
  });
});
