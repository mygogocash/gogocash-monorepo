/* eslint-disable @typescript-eslint/no-require-imports */

import { INestApplication } from '@nestjs/common';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';

import { Brand, BrandSchema } from '../src/brand/schemas/brand.schema';
import { StoredMediaService } from '../src/media/stored-media.service';
import { Category, CategorySchema } from '../src/offer/schemas/category.schema';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import { CategoryIntegrityService } from '../src/policy/category-integrity.service';
import { PolicyAggregateService } from '../src/policy/policy-aggregate.service';
import { PolicyIntegrityFenceService } from '../src/policy/policy-integrity-fence.service';
import { PolicyMediaAssetRegistryService } from '../src/policy/policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from '../src/policy/policy-media-cleanup.service';
import { PolicyQaFailureInjectionHook } from '../src/policy/policy-qa-failure-injection.hook';
import {
  PolicyCategorySource,
  PolicyCategorySourceSchema,
} from '../src/policy/schemas/policy-category-source.schema';
import {
  PolicyIntegrityState,
  PolicyIntegrityStateSchema,
} from '../src/policy/schemas/policy-integrity-state.schema';
import {
  PolicyLifecycleCommand,
  PolicyLifecycleCommandSchema,
} from '../src/policy/schemas/policy-lifecycle-command.schema';
import {
  PolicyMediaAssetRegistry,
  PolicyMediaAssetRegistrySchema,
} from '../src/policy/schemas/policy-media-asset-registry.schema';
import {
  PolicyMediaCleanup,
  PolicyMediaCleanupSchema,
} from '../src/policy/schemas/policy-media-cleanup.schema';
import {
  PolicyMediaWriteCommand,
  PolicyMediaWriteCommandSchema,
} from '../src/policy/schemas/policy-media-write-command.schema';
import { Policy, PolicySchema } from '../src/policy/schemas/policy.schema';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from '../src/test-support/local-mongo-uri';

const {
  runPolicyCategoryIntegrityMigration,
} = require('../scripts/policy-category-integrity-migration.cjs');

const LOCAL_MONGO_URI = optionalLocalMongoUri(process.env.MONGO_URI);
const suite =
  LOCAL_MONGO_URI && process.env.MONGO_REPLICA_SET === '1'
    ? describe
    : describe.skip;

suite('PolicyAggregateService — real Mongo rs0 transaction', () => {
  let app: INestApplication;
  let connection: Connection;
  let service: PolicyAggregateService;
  let categoryIntegrity: CategoryIntegrityService;
  let brandModel: Model<Brand>;
  let categoryModel: Model<Category>;
  let offerModel: Model<Offer>;
  let policyModel: Model<Policy>;
  let commandModel: Model<PolicyLifecycleCommand>;
  let sourceModel: Model<PolicyCategorySource>;
  let stateModel: Model<PolicyIntegrityState>;
  let cleanupModel: Model<PolicyMediaCleanup>;
  let registryModel: Model<PolicyMediaAssetRegistry>;
  let writeCommandModel: Model<PolicyMediaWriteCommand>;
  let media: {
    prepareCommandOwned: jest.Mock;
    putCommandOwned: jest.Mock;
    deleteCommandOwnedStrict: jest.Mock;
  };
  const marker = `policy-e2e-${process.pid}-${Date.now()}`;
  const database = `policy_aggregate_${process.pid}_${Date.now()}`;
  const mongoUri = LOCAL_MONGO_URI
    ? localMongoDatabaseUri(LOCAL_MONGO_URI, database)
    : '';

  async function clearDomainRows() {
    await Promise.all([
      brandModel.deleteMany({}),
      categoryModel.deleteMany({}),
      offerModel.deleteMany({}),
      policyModel.deleteMany({}),
      sourceModel.deleteMany({}),
      commandModel.deleteMany({}),
      cleanupModel.deleteMany({}),
      registryModel.deleteMany({}),
      writeCommandModel.deleteMany({}),
      stateModel.deleteMany({}),
    ]);
    await stateModel.create({
      key: 'category-integrity',
      status: 'ready',
      migration_version: 2,
    });
    await categoryIntegrity.assertReady(true);
  }

  beforeAll(async () => {
    media = {
      prepareCommandOwned: jest.fn(),
      putCommandOwned: jest.fn(),
      deleteCommandOwnedStrict: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri, { autoIndex: false }),
        MongooseModule.forFeature([
          { name: Brand.name, schema: BrandSchema },
          { name: Category.name, schema: CategorySchema },
          { name: Offer.name, schema: OfferSchema },
          { name: Policy.name, schema: PolicySchema },
          {
            name: PolicyLifecycleCommand.name,
            schema: PolicyLifecycleCommandSchema,
          },
          {
            name: PolicyCategorySource.name,
            schema: PolicyCategorySourceSchema,
          },
          {
            name: PolicyIntegrityState.name,
            schema: PolicyIntegrityStateSchema,
          },
          {
            name: PolicyMediaCleanup.name,
            schema: PolicyMediaCleanupSchema,
          },
          {
            name: PolicyMediaAssetRegistry.name,
            schema: PolicyMediaAssetRegistrySchema,
          },
          {
            name: PolicyMediaWriteCommand.name,
            schema: PolicyMediaWriteCommandSchema,
          },
        ]),
      ],
      providers: [
        PolicyAggregateService,
        PolicyIntegrityFenceService,
        CategoryIntegrityService,
        PolicyMediaAssetRegistryService,
        PolicyMediaCleanupService,
        {
          provide: PolicyQaFailureInjectionHook,
          useValue: { consumeOnce: jest.fn().mockReturnValue(false) },
        },
        {
          provide: StoredMediaService,
          useValue: media,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = moduleRef.get(getConnectionToken());
    service = moduleRef.get(PolicyAggregateService);
    categoryIntegrity = moduleRef.get(CategoryIntegrityService);
    brandModel = moduleRef.get(getModelToken(Brand.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));
    offerModel = moduleRef.get(getModelToken(Offer.name));
    policyModel = moduleRef.get(getModelToken(Policy.name));
    commandModel = moduleRef.get(getModelToken(PolicyLifecycleCommand.name));
    sourceModel = moduleRef.get(getModelToken(PolicyCategorySource.name));
    stateModel = moduleRef.get(getModelToken(PolicyIntegrityState.name));
    cleanupModel = moduleRef.get(getModelToken(PolicyMediaCleanup.name));
    registryModel = moduleRef.get(getModelToken(PolicyMediaAssetRegistry.name));
    writeCommandModel = moduleRef.get(
      getModelToken(PolicyMediaWriteCommand.name),
    );
    await connection.db!.dropDatabase();
    await runPolicyCategoryIntegrityMigration({
      db: connection.db,
      mode: 'apply',
    });
  });

  beforeEach(async () => {
    await clearDomainRows();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (connection?.db) await connection.db.dropDatabase();
    if (app) await app.close();
  });

  it('commits category, policy, source identity, and replay response atomically', async () => {
    const capability = await service.getTransactionCapability(true);
    expect(capability).toMatchObject({
      supported: true,
      topology: 'replica-set',
    });
    const requestKey = `${marker}-command`;
    const dto = {
      request_key: requestKey,
      category_name: `${marker} Travel`,
      icon_key: 'travel' as const,
      policy: JSON.stringify({
        category_id: '__new__',
        terms: {
          primary_locale: 'en',
          translations: { en: `Terms ${marker}` },
        },
        banner: {
          primary_locale: 'en',
          translations: { en: `Banner ${marker}` },
        },
      }),
    };

    const first = await service.execute(dto);
    const replay = await service.execute(dto);
    expect(replay).toEqual(first);
    const categoryId = new Types.ObjectId(String(first.category._id));
    const [category, policy, command, source] = await Promise.all([
      categoryModel.findById(categoryId).lean(),
      policyModel.findOne({ category_id: categoryId }).lean(),
      commandModel.findOne({ request_key: requestKey }).lean(),
      sourceModel.findOne({ category_id: categoryId }).lean(),
    ]);
    expect(category).toMatchObject({
      icon_key: 'travel',
      lifecycle_status: 'active',
    });
    expect(policy?.terms?.translations.en).toBe(`Terms ${marker}`);
    expect(command).toMatchObject({ status: 'committed', attempts: 1 });
    expect(source).toMatchObject({
      source: 'policy-admin',
      active: true,
    });
  });

  it('fences a stale delete worker across B recovery and C commit', async () => {
    jest.clearAllMocks();
    const requestKey = `${marker}-aba-command`;
    const dto = {
      request_key: requestKey,
      category_name: `${marker} ABA`,
      icon_key: 'travel' as const,
      policy: JSON.stringify({
        category_id: '__new__',
        terms: {
          primary_locale: 'en',
          translations: { en: `ABA terms ${marker}` },
        },
        banner: {
          primary_locale: 'en',
          translations: { en: `ABA banner ${marker}` },
        },
      }),
    };
    const file = {
      originalname: 'default.png',
      mimetype: 'image/png',
      size: 12,
      buffer: Buffer.from('same-content'),
    } as Express.Multer.File;
    const assetFor = (ownerKey: string, attemptToken: string) => ({
      provider: 'r2' as const,
      ownership: 'command-owned' as const,
      owner_key: ownerKey,
      owner_attempt_token: attemptToken,
      url: `https://media.example/categories/${ownerKey}/${attemptToken}/default.png`,
      bucket: 'media',
      object_key: `categories/${ownerKey}/${attemptToken}/${'a'.repeat(64)}.png`,
      sha256: 'a'.repeat(64),
      original_name: 'default.png',
      content_type: 'image/png',
    });
    media.prepareCommandOwned.mockImplementation(
      async (
        preparedFile: Express.Multer.File,
        _folder: string,
        ownerKey: string,
        attemptToken: string,
      ) => ({
        asset: assetFor(ownerKey, attemptToken),
        file: preparedFile,
        access: 'public',
      }),
    );
    media.putCommandOwned
      .mockRejectedValueOnce(new Error('response lost after accepted Put'))
      .mockImplementation(
        async (prepared: { asset: unknown }) => prepared.asset,
      );
    let enterDeleteA!: () => void;
    let resumeDeleteA!: () => void;
    const deleteAEntered = new Promise<void>((resolve) => {
      enterDeleteA = resolve;
    });
    const stalledDeleteA = new Promise<void>((resolve) => {
      resumeDeleteA = resolve;
    });
    media.deleteCommandOwnedStrict
      .mockImplementationOnce(async () => {
        enterDeleteA();
        await stalledDeleteA;
      })
      .mockResolvedValueOnce(undefined);

    const workerA = service.execute(dto, file);
    await deleteAEntered;
    const commandA = await commandModel
      .findOne({ request_key: requestKey })
      .lean();
    expect(commandA).toMatchObject({
      status: 'compensating',
      compensation_token: expect.any(String),
    });
    const assetA = commandA?.planned_asset;
    await commandModel.updateOne(
      {
        request_key: requestKey,
        compensation_token: commandA?.compensation_token,
      },
      { $set: { lease_expires_at: new Date(Date.now() - 1_000) } },
    );
    await registryModel.updateOne(
      { url: assetA?.url, state: 'deleting' },
      { $set: { delete_lease_expires_at: new Date(Date.now() - 1_000) } },
    );

    await expect(service.recoverExpiredCommands()).resolves.toBe(1);
    await expect(
      commandModel.findOne({ request_key: requestKey }).lean(),
    ).resolves.toMatchObject({ status: 'failed' });

    const responseC = await service.execute(dto, file);
    const commandC = await commandModel
      .findOne({ request_key: requestKey })
      .lean();
    const categoryC = await categoryModel
      .findById(responseC.category._id)
      .lean();
    expect(commandC).toMatchObject({ status: 'committed', attempts: 2 });
    expect(commandC?.attempt_token).not.toBe(commandA?.attempt_token);
    expect(commandC?.planned_asset?.object_key).not.toBe(assetA?.object_key);
    expect(categoryC?.banner_asset?.object_key).toBe(
      commandC?.planned_asset?.object_key,
    );
    await expect(
      cleanupModel.findOne({ request_key: requestKey }).lean(),
    ).resolves.toMatchObject({
      status: 'deleted',
      asset: { object_key: assetA?.object_key },
    });
    await expect(
      registryModel.findOne({ url: assetA?.url }).lean(),
    ).resolves.toMatchObject({ state: 'deleted' });

    resumeDeleteA();
    await expect(workerA).rejects.toThrow(/registry .* fence was lost/i);
    const finalCommand = await commandModel
      .findOne({ request_key: requestKey })
      .lean();
    const finalCategory = await categoryModel
      .findById(responseC.category._id)
      .lean();
    expect(finalCommand).toMatchObject({
      status: 'committed',
      attempt_token: commandC?.attempt_token,
    });
    expect(finalCategory?.banner_asset?.object_key).toBe(
      commandC?.planned_asset?.object_key,
    );
    expect(media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(2);
    expect(
      media.deleteCommandOwnedStrict.mock.calls.every(
        ([asset]) => asset.object_key === assetA?.object_key,
      ),
    ).toBe(true);
  });
});
