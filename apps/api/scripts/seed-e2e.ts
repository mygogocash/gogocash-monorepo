import 'dotenv/config';
import path from 'node:path';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { seedRbacAdmins } from './seed-local-admin';
import { seedLocalCustomer } from './seed-local-customer';
import { seedE2eFixtures } from './seed-e2e-fixtures';

export type E2eSeedExport = {
  adminToken: string;
  viewerToken: string;
  editorToken: string;
  customerToken: string;
  userId: string;
  brandId: string;
  disabledBrandId: string;
  brandOfferId: number;
  couponCode: string;
  questId: string;
  catalogSku: string;
  apiUrl: string;
  adminUrl: string;
  appUrl: string;
};

async function loginAdmin(
  jwtAdminSecret: string,
  email: string,
): Promise<string> {
  await mongoose.connect(process.env.MONGO_URI as string);
  const UserAdmin = mongoose.connection.collection('useradmins');
  const user = await UserAdmin.findOne({
    $or: [{ email }, { username: email }],
  });
  await mongoose.disconnect();
  if (!user) {
    throw new Error(`Admin not found: ${email}`);
  }
  const jwtService = new JwtService();
  return jwtService.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
    { secret: jwtAdminSecret, expiresIn: '7d' },
  );
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  const jwtAdminSecret = process.env.JWT_ADMIN_SECRET;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }
  if (!jwtAdminSecret) {
    throw new Error('JWT_ADMIN_SECRET is required');
  }

  const force = process.argv.includes('--force');

  await seedRbacAdmins(mongoUri, force);
  const customer = await seedLocalCustomer(mongoUri, force);
  const fixtures = await seedE2eFixtures(mongoUri, customer.userId, force);

  const adminToken = await loginAdmin(jwtAdminSecret, 'admin@gogocash.co');
  const viewerToken = await loginAdmin(jwtAdminSecret, 'viewer@gogocash.co');
  const editorToken = await loginAdmin(jwtAdminSecret, 'editor@gogocash.co');

  const payload: E2eSeedExport = {
    adminToken,
    viewerToken,
    editorToken,
    customerToken: customer.customerToken,
    userId: customer.userId,
    brandId: fixtures.brandId,
    disabledBrandId: fixtures.disabledBrandId,
    brandOfferId: fixtures.brandOfferId,
    couponCode: fixtures.couponCode,
    questId: fixtures.questId,
    catalogSku: fixtures.catalogSku,
    apiUrl: process.env.E2E_API_URL ?? 'http://localhost:8080',
    adminUrl: process.env.E2E_ADMIN_URL ?? 'http://localhost:3000',
    appUrl: process.env.E2E_APP_URL ?? 'http://localhost:8081',
  };

  const outPath = process.env.E2E_SEED_OUT
    ? path.resolve(process.env.E2E_SEED_OUT)
    : path.resolve(process.cwd(), '.e2e/seed.json');
  const fs = await import('node:fs/promises');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const json = JSON.stringify(payload, null, 2);
  await fs.writeFile(outPath, json, 'utf8');
  console.log(`[seed:e2e] wrote ${outPath}`);
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error('[seed:e2e]', error.message);
    process.exit(1);
  });
}
