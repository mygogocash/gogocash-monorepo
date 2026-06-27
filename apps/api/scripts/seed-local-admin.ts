import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import mongoose, { Model, Schema } from 'mongoose';

type UserAdminSeedDocument = {
  username: string;
  password: string;
  email: string;
  role: string;
};

export type SeedLocalAdminOptions = {
  email: string;
  password: string;
  username: string;
  force: boolean;
};

const DEFAULT_EMAIL = 'admin@gogocash.co';
const DEFAULT_PASSWORD = '1234';
const DEFAULT_USERNAME = 'admin';
const BCRYPT_ROUNDS = 10;

export function parseSeedLocalAdminOptions(argv: string[]): SeedLocalAdminOptions {
  const options: SeedLocalAdminOptions = {
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
    username: DEFAULT_USERNAME,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--email') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('--email requires a value');
      }
      options.email = next.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--email=')) {
      options.email = arg.slice('--email='.length).trim();
      continue;
    }

    if (arg === '--password') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('--password requires a value');
      }
      options.password = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--password=')) {
      options.password = arg.slice('--password='.length);
      continue;
    }

    if (arg === '--username') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('--username requires a value');
      }
      options.username = next.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--username=')) {
      options.username = arg.slice('--username='.length).trim();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.email) {
    throw new Error('Email must not be empty');
  }

  if (!options.password) {
    throw new Error('Password must not be empty');
  }

  if (!options.username) {
    throw new Error('Username must not be empty');
  }

  return options;
}

export function assertLocalMongoUri(mongoUri: string, force: boolean): void {
  if (force) {
    return;
  }

  const isLocal =
    /mongodb(\+srv)?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(mongoUri);

  if (!isLocal) {
    throw new Error(
      'Refusing to seed admin against non-local MongoDB. Set MONGO_URI to a local instance (e.g. mongodb://localhost:27017/gogocash) or pass --force to override.',
    );
  }
}

function getUserAdminModel(): Model<UserAdminSeedDocument> {
  const modelName = 'UserAdmin';
  const userAdminSchema = new Schema<UserAdminSeedDocument>(
    {
      username: { type: String, required: true },
      password: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      role: {
        type: String,
        enum: [
          'viewer',
          'support',
          'approver',
          'superadmin',
          'super_admin',
          'admin',
          'editor',
        ],
        default: 'viewer',
      },
    },
    { collection: 'useradmins', timestamps: true },
  );

  return (mongoose.models[modelName] ||
    mongoose.model(modelName, userAdminSchema)) as Model<UserAdminSeedDocument>;
}

export async function seedLocalAdmin(options: SeedLocalAdminOptions): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  assertLocalMongoUri(mongoUri, options.force);

  const hashedPassword = await bcrypt.hash(options.password, BCRYPT_ROUNDS);

  await mongoose.connect(mongoUri);
  const UserAdminModel = getUserAdminModel();

  try {
    const result = await UserAdminModel.updateOne(
      { email: options.email },
      {
        $set: {
          email: options.email,
          username: options.username,
          password: hashedPassword,
          role: 'superadmin',
        },
      },
      { upsert: true },
    );

    const action =
      (result.upsertedCount ?? 0) > 0 ? 'created' : 'updated';

    console.log(
      `[seed-local-admin] ${action} superadmin ${options.email} (username=${options.username}). Sign in with that email and the password you passed.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedLocalAdmin(parseSeedLocalAdminOptions(process.argv.slice(2))).catch(
    (error: Error) => {
      console.error('[seed-local-admin]', error.message);
      process.exit(1);
    },
  );
}
