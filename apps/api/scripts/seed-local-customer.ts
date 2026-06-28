import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../src/user/schemas/user.schema';
import { assertLocalMongoUri } from './seed-local-admin';

export const E2E_CUSTOMER_EMAIL = 'e2e.customer@gogocash.co';
export const E2E_CUSTOMER_FIREBASE_ID = 'e2e-firebase-customer-001';

export type SeedCustomerResult = {
  userId: string;
  email: string;
  customerToken: string;
};

export async function seedLocalCustomer(
  mongoUri: string,
  force = false,
): Promise<SeedCustomerResult> {
  assertLocalMongoUri(mongoUri, force);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  await mongoose.connect(mongoUri);
  const UserModel = (mongoose.models[User.name] ||
    mongoose.model(User.name, UserSchema)) as Model<User>;

  try {
    const user = await UserModel.findOneAndUpdate(
      { id_firebase: E2E_CUSTOMER_FIREBASE_ID },
      {
        $set: {
          id_firebase: E2E_CUSTOMER_FIREBASE_ID,
          email: E2E_CUSTOMER_EMAIL,
          username: 'E2E Customer',
          provider: 'e2e_seed',
          country: 'TH',
        },
      },
      { upsert: true, new: true },
    );

    const jwtService = new JwtService();
    const customerToken = jwtService.sign(
      { userId: user._id.toString(), firebaseId: E2E_CUSTOMER_FIREBASE_ID },
      { secret: jwtSecret, expiresIn: '7d' },
    );

    console.log(
      `[seed-local-customer] upserted ${E2E_CUSTOMER_EMAIL} (${user._id.toString()})`,
    );

    return {
      userId: user._id.toString(),
      email: E2E_CUSTOMER_EMAIL,
      customerToken,
    };
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[seed-local-customer] MONGO_URI is required');
    process.exit(1);
  }
  seedLocalCustomer(mongoUri, process.argv.includes('--force')).catch(
    (error: Error) => {
      console.error('[seed-local-customer]', error.message);
      process.exit(1);
    },
  );
}
