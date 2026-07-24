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
import { Category, CategorySchema } from '../src/offer/schemas/category.schema';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import { OfferService } from '../src/offer/offer.service';
import { StoredMediaService } from '../src/media/stored-media.service';
import { CategoryIntegrityService } from '../src/policy/category-integrity.service';
import { PolicyIntegrityFenceService } from '../src/policy/policy-integrity-fence.service';
import { PolicyMediaAssetRegistryService } from '../src/policy/policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from '../src/policy/policy-media-cleanup.service';
import { PolicyMediaWriteService } from '../src/policy/policy-media-write.service';
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

suite('CategoryIntegrityService — real Mongo rs0 races', () => {
  let app: INestApplication;
  let connection: Connection;
  let service: CategoryIntegrityService;
  let registryService: PolicyMediaAssetRegistryService;
  let brandModel: Model<Brand>;
  let categoryModel: Model<Category>;
  let offerModel: Model<Offer>;
  let policyModel: Model<Policy>;
  let sourceModel: Model<PolicyCategorySource>;
  let stateModel: Model<PolicyIntegrityState>;
  let commandModel: Model<PolicyLifecycleCommand>;
  let cleanupModel: Model<PolicyMediaCleanup>;
  let registryModel: Model<PolicyMediaAssetRegistry>;
  let writeCommandModel: Model<PolicyMediaWriteCommand>;
  let mediaCleanup: PolicyMediaCleanupService;
  let mediaWrite: PolicyMediaWriteService;
  let storedMedia: {
    deleteStored: jest.Mock;
    deleteCommandOwnedStrict: jest.Mock;
    prepareCommandOwned: jest.Mock;
    putCommandOwned: jest.Mock;
  };

  const database = `policy_integrity_${process.pid}_${Date.now()}`;
  const mongoUri = LOCAL_MONGO_URI
    ? localMongoDatabaseUri(LOCAL_MONGO_URI, database)
    : '';

  const validAsset = (owner: string) => ({
    provider: 'r2' as const,
    ownership: 'command-owned' as const,
    owner_key: owner,
    owner_attempt_token: 'attempt-a',
    url: `https://media.example/${owner}.png`,
    bucket: 'media',
    object_key: `categories/${owner}-0123456789abcdef/attempt-a-0123456789abcdef/${'a'.repeat(64)}.png`,
    sha256: 'a'.repeat(64),
    original_name: `${owner}.png`,
    content_type: 'image/png',
  });

  async function registerAsset(asset: ReturnType<typeof validAsset>) {
    const session = await connection.startSession();
    try {
      await session.withTransaction(async () => {
        await registryService.registerCommandOwnedInSession(asset, session);
      });
    } finally {
      await session.endSession();
    }
  }

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
    ]);
  }

  beforeAll(async () => {
    storedMedia = {
      deleteStored: jest.fn().mockResolvedValue(undefined),
      deleteCommandOwnedStrict: jest.fn().mockResolvedValue(undefined),
      prepareCommandOwned: jest.fn(
        async (
          file: Express.Multer.File,
          folder: string,
          ownerKey: string,
          attemptToken: string,
        ) => ({
          file,
          access: 'public',
          asset: {
            provider: 'r2',
            ownership: 'command-owned',
            owner_key: ownerKey,
            owner_attempt_token: attemptToken,
            url: `https://media.example/${folder}/${encodeURIComponent(ownerKey)}/${attemptToken}.png`,
            bucket: 'media',
            object_key: `${folder}/${ownerKey}/${attemptToken}/${'f'.repeat(64)}.png`,
            sha256: 'f'.repeat(64),
            original_name: file.originalname || 'upload.png',
            content_type: file.mimetype || 'image/png',
          },
        }),
      ),
      putCommandOwned: jest.fn(async (prepared) => prepared.asset),
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
            name: PolicyCategorySource.name,
            schema: PolicyCategorySourceSchema,
          },
          {
            name: PolicyIntegrityState.name,
            schema: PolicyIntegrityStateSchema,
          },
          {
            name: PolicyLifecycleCommand.name,
            schema: PolicyLifecycleCommandSchema,
          },
          {
            name: PolicyMediaAssetRegistry.name,
            schema: PolicyMediaAssetRegistrySchema,
          },
          {
            name: PolicyMediaCleanup.name,
            schema: PolicyMediaCleanupSchema,
          },
          {
            name: PolicyMediaWriteCommand.name,
            schema: PolicyMediaWriteCommandSchema,
          },
        ]),
      ],
      providers: [
        PolicyIntegrityFenceService,
        CategoryIntegrityService,
        PolicyMediaAssetRegistryService,
        PolicyMediaCleanupService,
        PolicyMediaWriteService,
        { provide: StoredMediaService, useValue: storedMedia },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = moduleRef.get(getConnectionToken());
    service = moduleRef.get(CategoryIntegrityService);
    registryService = moduleRef.get(PolicyMediaAssetRegistryService);
    brandModel = moduleRef.get(getModelToken(Brand.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));
    offerModel = moduleRef.get(getModelToken(Offer.name));
    policyModel = moduleRef.get(getModelToken(Policy.name));
    sourceModel = moduleRef.get(getModelToken(PolicyCategorySource.name));
    stateModel = moduleRef.get(getModelToken(PolicyIntegrityState.name));
    commandModel = moduleRef.get(getModelToken(PolicyLifecycleCommand.name));
    cleanupModel = moduleRef.get(getModelToken(PolicyMediaCleanup.name));
    registryModel = moduleRef.get(getModelToken(PolicyMediaAssetRegistry.name));
    writeCommandModel = moduleRef.get(
      getModelToken(PolicyMediaWriteCommand.name),
    );
    mediaCleanup = moduleRef.get(PolicyMediaCleanupService);
    mediaWrite = moduleRef.get(PolicyMediaWriteService);
    await connection.db!.dropDatabase();
    await runPolicyCategoryIntegrityMigration({
      db: connection.db,
      mode: 'apply',
    });
  });

  beforeEach(async () => {
    await clearDomainRows();
    storedMedia.deleteStored.mockClear();
    storedMedia.deleteCommandOwnedStrict.mockClear();
    storedMedia.prepareCommandOwned.mockClear();
    storedMedia.putCommandOwned.mockClear();
    await stateModel.updateOne(
      { key: 'category-integrity' },
      {
        $set: { status: 'ready', migration_version: 2 },
        $unset: {
          migration_attempt_token: 1,
          migration_lease_expires_at: 1,
          last_error: 1,
        },
      },
    );
    await service.assertReady(true);
  });

  afterAll(async () => {
    if (connection?.db) await connection.db.dropDatabase();
    if (app) await app.close();
  });

  it('applies the migration twice idempotently with the exact replacement indexes', async () => {
    await runPolicyCategoryIntegrityMigration({
      db: connection.db,
      mode: 'apply',
    });
    await runPolicyCategoryIntegrityMigration({
      db: connection.db,
      mode: 'apply',
    });
    await expect(service.assertReady(true)).resolves.toBeUndefined();

    await expect(categoryModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'policy_category_name_normalized_v2',
          unique: true,
        }),
      ]),
    );
    await expect(sourceModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'policy_category_source_identity_v2',
          unique: true,
        }),
        expect.objectContaining({
          name: 'policy_category_source_category_id_v2',
        }),
      ]),
    );
    await expect(policyModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'category_id_1', unique: true }),
      ]),
    );
    await expect(commandModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'request_key_1', unique: true }),
      ]),
    );
    await expect(cleanupModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'request_key_1_payload_hash_1_attempt_token_1_reason_1_asset.object_key_1',
          unique: true,
        }),
      ]),
    );
    await expect(registryModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'policy_media_asset_registry_url_hash_v1',
          unique: true,
        }),
        expect.objectContaining({
          name: 'policy_media_asset_registry_state_lease_v1',
        }),
      ]),
    );
    await expect(writeCommandModel.collection.indexes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'request_key_1', unique: true }),
        expect.objectContaining({
          name: 'planned_asset_owner_1_attempt_1_object_1',
        }),
      ]),
    );
  });

  it('backfills one committed Offer asset and fails closed on fabricated Category and Offer proof', async () => {
    const offerId = new Types.ObjectId();
    const requestKey = `offer-migration:${offerId}`;
    const offerAsset = {
      ...validAsset(`${requestKey}:logo`),
      object_key: `brands/${requestKey}/attempt-a/${'a'.repeat(64)}.png`,
    };
    await writeCommandModel.create({
      request_key: requestKey,
      payload_hash: '1'.repeat(64),
      owner_type: 'offer',
      owner_id: offerId,
      operation: 'offer-create',
      status: 'committed',
      attempt_token: offerAsset.owner_attempt_token,
      attempts: 1,
      planned_assets: [
        {
          role: 'logo',
          folder: 'brands',
          asset: offerAsset,
          upload_state: 'confirmed',
        },
      ],
    });
    await offerModel.collection.insertOne({
      _id: offerId,
      offer_id: 910001,
      merchant_id: 910001,
      offer_name: 'Committed migration offer',
      source: 'manual',
      logo: offerAsset.url,
      logo_asset: offerAsset,
      categories_normalized: null,
    } as never);

    await runPolicyCategoryIntegrityMigration({
      db: connection.db,
      mode: 'apply',
    });

    await expect(registryModel.find({}).lean()).resolves.toEqual([
      expect.objectContaining({
        url: offerAsset.url,
        owner_key: offerAsset.owner_key,
        owner_attempt_token: offerAsset.owner_attempt_token,
        object_key: offerAsset.object_key,
        state: 'active',
      }),
    ]);

    await clearDomainRows();
    const categoryId = new Types.ObjectId();
    const fabricatedCategoryAsset = validAsset(
      `fabricated-category:${categoryId}:image`,
    );
    const fabricatedOfferAsset = {
      ...validAsset(`fabricated-offer:${offerId}:logo`),
      object_key: `brands/fabricated-offer/${offerId}/${'b'.repeat(64)}.png`,
      sha256: 'b'.repeat(64),
    };
    await categoryModel.collection.insertOne({
      _id: categoryId,
      name: 'Fabricated proof category',
      name_normalized: 'fabricated proof category',
      lifecycle_status: 'active',
      revision: 1,
      image: fabricatedCategoryAsset.url,
      image_asset: fabricatedCategoryAsset,
    } as never);
    await offerModel.collection.insertOne({
      _id: offerId,
      offer_id: 910002,
      merchant_id: 910002,
      offer_name: 'Fabricated proof offer',
      source: 'manual',
      logo: fabricatedOfferAsset.url,
      logo_asset: fabricatedOfferAsset,
      categories_normalized: null,
    } as never);

    await expect(
      runPolicyCategoryIntegrityMigration({
        db: connection.db,
        mode: 'apply',
      }),
    ).rejects.toThrow(/2 quarantine item/i);
    await expect(
      stateModel.findOne({ key: 'category-integrity' }).lean(),
    ).resolves.toMatchObject({
      status: 'failed',
      quarantine: expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing-committed-media-command-proof',
          owner_type: 'category',
          owner_id: String(categoryId),
          field: 'image_asset',
        }),
        expect.objectContaining({
          kind: 'missing-committed-media-command-proof',
          owner_type: 'offer',
          owner_id: String(offerId),
          field: 'logo_asset',
        }),
      ]),
    });
    await expect(registryModel.countDocuments({})).resolves.toBe(0);
  });

  it('replays createAdminOffer after a lost response with one exact Offer/assets and conflicts on changed payload', async () => {
    const offerService = new OfferService(
      offerModel,
      {} as never,
      {} as never,
      categoryModel,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      storedMedia as never,
      service,
      mediaWrite,
      registryService,
      mediaCleanup,
      {} as never,
      {} as never,
    );
    const requestKey = `offer-create-real-replay:${new Types.ObjectId()}`;
    const logo = {
      originalname: 'replay-logo.png',
      mimetype: 'image/png',
      size: 11,
      buffer: Buffer.from('replay-logo'),
    } as Express.Multer.File;
    const body = {
      request_key: requestKey,
      brand_name: 'Real replay brand',
      affiliate_tracking_link: 'https://track.example/real-replay',
      custom_terms: 'Original durable terms',
    };

    const committed = await offerService.createAdminOffer(body, {
      logo_desktop: [logo],
    });
    const replayed = await offerService.createAdminOffer(body, {
      logo_desktop: [logo],
    });

    expect(String(replayed._id)).toBe(String(committed._id));
    expect(replayed).toMatchObject({
      logo: committed.logo,
      logo_asset: expect.objectContaining({
        url: committed.logo,
        owner_key: `${requestKey}:logo`,
      }),
    });
    await expect(offerModel.countDocuments({})).resolves.toBe(1);
    await expect(
      writeCommandModel.countDocuments({ request_key: requestKey }),
    ).resolves.toBe(1);
    await expect(
      registryModel.countDocuments({ url: committed.logo }),
    ).resolves.toBe(1);
    expect(storedMedia.putCommandOwned).toHaveBeenCalledTimes(1);

    await expect(
      offerService.createAdminOffer(
        { ...body, custom_terms: 'Changed durable terms' },
        { logo_desktop: [logo] },
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(offerModel.countDocuments({})).resolves.toBe(1);
  });

  it('replays a zero-file createAdminOffer from its committed command and conflicts on changed payload', async () => {
    const offerService = new OfferService(
      offerModel,
      {} as never,
      {} as never,
      categoryModel,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      storedMedia as never,
      service,
      mediaWrite,
      registryService,
      mediaCleanup,
      {} as never,
      {} as never,
    );
    const requestKey = `offer-create-zero-file:${new Types.ObjectId()}`;
    const body = {
      request_key: requestKey,
      brand_name: 'Real zero-file replay brand',
      affiliate_tracking_link: 'https://track.example/real-zero-file-replay',
      custom_terms: 'Original zero-file durable terms',
    };

    const committed = await offerService.createAdminOffer(body);
    const replayed = await offerService.createAdminOffer(body);

    expect(String(replayed._id)).toBe(String(committed._id));
    expect(replayed.toObject()).toEqual(committed.toObject());
    await expect(offerModel.countDocuments({})).resolves.toBe(1);
    await expect(
      writeCommandModel.findOne({ request_key: requestKey }).lean(),
    ).resolves.toMatchObject({
      owner_type: 'offer',
      owner_id: committed._id,
      operation: 'offer-create',
      status: 'committed',
      planned_assets: [],
    });
    await expect(
      writeCommandModel.countDocuments({ request_key: requestKey }),
    ).resolves.toBe(1);
    await expect(registryModel.countDocuments({})).resolves.toBe(0);
    expect(storedMedia.prepareCommandOwned).not.toHaveBeenCalled();
    expect(storedMedia.putCommandOwned).not.toHaveBeenCalled();

    await expect(
      offerService.createAdminOffer({
        ...body,
        custom_terms: 'Changed zero-file durable terms',
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(offerModel.countDocuments({})).resolves.toBe(1);
    await expect(
      writeCommandModel.countDocuments({ request_key: requestKey }),
    ).resolves.toBe(1);
  });

  it('serializes a Brand attachment that commits first against a concurrent delete claim', async () => {
    const asset = validAsset('brand-attach-wins');
    const registrationSession = await connection.startSession();
    await registrationSession.withTransaction(async () => {
      await registryService.registerCommandOwnedInSession(
        asset,
        registrationSession,
      );
    });
    await registrationSession.endSession();

    const attachSession = await connection.startSession();
    const deleteSession = await connection.startSession();
    let releaseAttach!: () => void;
    let enteredAttach!: () => void;
    const attachEntered = new Promise<void>((resolve) => {
      enteredAttach = resolve;
    });
    const attachRelease = new Promise<void>((resolve) => {
      releaseAttach = resolve;
    });
    const attach = attachSession.withTransaction(async () => {
      await registryService.touchAttachInSession(asset.url, attachSession);
      await brandModel.create(
        [
          {
            brand_name: 'Attach Wins Brand',
            brand_slug: `attach-wins-${Date.now()}`,
            logo: asset.url,
          },
        ],
        { session: attachSession },
      );
      enteredAttach();
      await attachRelease;
    });
    await attachEntered;

    let claim: Awaited<
      ReturnType<PolicyMediaAssetRegistryService['beginDeleteInSession']>
    >;
    const deleting = deleteSession.withTransaction(async () => {
      claim = await registryService.beginDeleteInSession(
        asset.url,
        deleteSession,
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    releaseAttach();
    await attach;
    await deleting;
    await attachSession.endSession();
    await deleteSession.endSession();

    expect(claim!).toEqual({
      claimed: false,
      reason: 'referenced',
      references: { categories: 0, offers: 0, brands: 1, total: 1 },
    });
    await expect(
      registryModel.findOne({ url: asset.url }).lean(),
    ).resolves.toMatchObject({ state: 'active', revision: 2 });
    await expect(brandModel.countDocuments({ logo: asset.url })).resolves.toBe(
      1,
    );
  });

  it('rescans a drifted Offer structured alias that commits concurrently and refuses deletion', async () => {
    const ownerId = new Types.ObjectId();
    const requestKey = `offer-structured-race:${ownerId}`;
    const asset = {
      ...validAsset(`${requestKey}:logo`),
      object_key: `brands/${requestKey}/attempt-a/${'a'.repeat(64)}.png`,
    };
    await registerAsset(asset);
    await writeCommandModel.create({
      request_key: requestKey,
      payload_hash: '2'.repeat(64),
      owner_type: 'offer',
      owner_id: ownerId,
      operation: 'offer-create',
      status: 'committed',
      attempt_token: asset.owner_attempt_token,
      attempts: 1,
      planned_assets: [
        {
          role: 'logo',
          folder: 'brands',
          asset,
          upload_state: 'confirmed',
        },
      ],
    });
    const cleanupKey = `offer-structured-cleanup:${ownerId}`;
    const journalSession = await connection.startSession();
    await journalSession.withTransaction(async () => {
      await mediaCleanup.journalCommandOwnedAssets(
        {
          owner_type: 'offer',
          owner_id: ownerId,
          request_key: cleanupKey,
          payload_hash: '3'.repeat(64),
          attempt_token: cleanupKey,
          reason: 'replaced-after-commit',
          assets: [asset],
        },
        journalSession,
      );
    });
    await journalSession.endSession();

    const attachSession = await connection.startSession();
    let enteredAttach!: () => void;
    let releaseAttach!: () => void;
    const attachEntered = new Promise<void>((resolve) => {
      enteredAttach = resolve;
    });
    const attachRelease = new Promise<void>((resolve) => {
      releaseAttach = resolve;
    });
    const driftedOfferId = new Types.ObjectId();
    const attach = attachSession.withTransaction(async () => {
      await registryService.touchAttachInSession(asset.url, attachSession);
      await offerModel.create(
        [
          {
            _id: driftedOfferId,
            offer_id: 910010,
            merchant_id: 910010,
            offer_name: 'Drifted alias attachment',
            source: 'manual',
            logo: 'https://provider.example/new-flat-logo.png',
            logo_asset: asset,
          },
        ],
        { session: attachSession },
      );
      enteredAttach();
      await attachRelease;
    });
    await attachEntered;

    const cleanup = mediaCleanup.processRequest(cleanupKey);
    await new Promise((resolve) => setTimeout(resolve, 100));
    releaseAttach();
    await attach;
    await attachSession.endSession();

    await expect(cleanup).resolves.toEqual({ deleted: 0, pending: 1 });
    await expect(
      cleanupModel.findOne({ request_key: cleanupKey }).lean(),
    ).resolves.toMatchObject({
      status: 'pending',
      last_error: expect.stringContaining('still globally referenced (1)'),
    });
    await expect(
      offerModel.findById(driftedOfferId).lean(),
    ).resolves.toMatchObject({
      logo: 'https://provider.example/new-flat-logo.png',
      logo_asset: expect.objectContaining({ url: asset.url }),
    });
    expect(storedMedia.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('rejects a concurrent Brand attachment after the delete claim commits first', async () => {
    const asset = validAsset('delete-claim-wins');
    const registrationSession = await connection.startSession();
    await registrationSession.withTransaction(async () => {
      await registryService.registerCommandOwnedInSession(
        asset,
        registrationSession,
      );
    });
    await registrationSession.endSession();

    const deleteSession = await connection.startSession();
    const attachSession = await connection.startSession();
    let releaseDelete!: () => void;
    let enteredDelete!: () => void;
    const deleteEntered = new Promise<void>((resolve) => {
      enteredDelete = resolve;
    });
    const deleteRelease = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    let claim: Awaited<
      ReturnType<PolicyMediaAssetRegistryService['beginDeleteInSession']>
    >;
    const deleting = deleteSession.withTransaction(async () => {
      claim = await registryService.beginDeleteInSession(
        asset.url,
        deleteSession,
      );
      enteredDelete();
      await deleteRelease;
    });
    await deleteEntered;

    const attaching = attachSession.withTransaction(async () => {
      await registryService.touchAttachInSession(asset.url, attachSession);
      await brandModel.create(
        [
          {
            brand_name: 'Delete Wins Brand',
            brand_slug: `delete-wins-${Date.now()}`,
            logo: asset.url,
          },
        ],
        { session: attachSession },
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    releaseDelete();
    await deleting;
    await expect(attaching).rejects.toMatchObject({ status: 409 });
    await deleteSession.endSession();
    await attachSession.endSession();

    expect(claim!).toMatchObject({ claimed: true });
    await expect(
      registryModel.findOne({ url: asset.url }).lean(),
    ).resolves.toMatchObject({ state: 'deleting', revision: 2 });
    await expect(brandModel.countDocuments({ logo: asset.url })).resolves.toBe(
      0,
    );
  });

  it('allows exactly one winner in an assignment-versus-retire revision race', async () => {
    const categoryId = new Types.ObjectId();
    await categoryModel.create({
      _id: categoryId,
      name: 'Race Category',
      name_normalized: 'race category',
      lifecycle_status: 'active',
      revision: 1,
    });
    await sourceModel.create({
      category_id: categoryId,
      source: 'legacy',
      source_key: 'race category',
      request_key: 'race-source',
      active: true,
      tombstoned: false,
      revision: 1,
    });

    const results = await Promise.allSettled([
      service.withPolicyCategoryAssignment(
        String(categoryId),
        'Race Category',
        async (assignment, session) => {
          await offerModel.collection.insertOne(
            {
              _id: new Types.ObjectId(),
              offer_id: 900001,
              source: 'manual',
              categories: 'Race Category',
              ...assignment,
            } as never,
            { session },
          );
          return assignment;
        },
      ),
      service.retire(String(categoryId), {
        request_key: 'race-retire-command',
        expected_revision: 1,
      }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const category = await categoryModel.findById(categoryId).lean();
    const offer = await offerModel.findOne({ offer_id: 900001 }).lean();
    if (offer) {
      expect(category).toMatchObject({
        lifecycle_status: 'active',
        revision: 2,
      });
    } else {
      expect(category).toMatchObject({
        lifecycle_status: 'retired',
        revision: 2,
      });
    }
  });

  it('derives the raw category from the same transaction after an Involve interleaving', async () => {
    const categoryA = new Types.ObjectId();
    const categoryB = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    await categoryModel.insertMany([
      {
        _id: categoryA,
        name: 'Category A',
        name_normalized: 'category a',
        lifecycle_status: 'active',
        revision: 1,
      },
      {
        _id: categoryB,
        name: 'Category B',
        name_normalized: 'category b',
        lifecycle_status: 'active',
        revision: 1,
      },
    ]);
    await sourceModel.insertMany([
      {
        category_id: categoryA,
        source: 'legacy',
        source_key: 'category a',
        request_key: 'stale-race-source-a',
        active: true,
        tombstoned: false,
        revision: 1,
      },
      {
        category_id: categoryB,
        source: 'legacy',
        source_key: 'category b',
        request_key: 'stale-race-source-b',
        active: true,
        tombstoned: false,
        revision: 1,
      },
    ]);
    await offerModel.collection.insertOne({
      _id: offerId,
      offer_id: 900010,
      source: 'manual',
      categories: 'Category A',
      categories_normalized: 'category a',
      policy_category_id: String(categoryA),
    } as never);

    const staleAdminRead = await offerModel.findById(offerId).lean();
    expect(staleAdminRead?.categories).toBe('Category A');

    await service.withInvolveCategoryAssignment(
      'Category B',
      async (assignment, session) =>
        offerModel.updateOne(
          { _id: offerId },
          { $set: { categories: 'Category B', ...assignment } },
          { session },
        ),
    );

    await service.withPolicyCategoryAssignment(
      String(categoryB),
      async (session) => {
        const current = await offerModel
          .findById(offerId)
          .session(session)
          .lean();
        return current?.categories;
      },
      async (assignment, session) =>
        offerModel.updateOne(
          { _id: offerId },
          { $set: assignment },
          { session },
        ),
    );

    await expect(offerModel.findById(offerId).lean()).resolves.toMatchObject({
      categories: 'Category B',
      categories_normalized: 'category b',
      policy_category_id: String(categoryB),
    });
  });

  it('atomically unsets a cleared direct assignment and permits retirement after the final reference is gone', async () => {
    const categoryId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    await categoryModel.create({
      _id: categoryId,
      name: 'Direct Only',
      name_normalized: 'direct only',
      lifecycle_status: 'active',
      revision: 1,
    });
    await sourceModel.create({
      category_id: categoryId,
      source: 'legacy',
      source_key: 'direct only',
      request_key: 'direct-only-source',
      active: true,
      tombstoned: false,
      revision: 1,
    });
    await offerModel.collection.insertOne({
      _id: offerId,
      offer_id: 900011,
      source: 'manual',
      categories: '',
      categories_normalized: null,
      policy_category_id: String(categoryId),
    } as never);

    await service.withPolicyCategoryAssignment(
      '',
      async (session) => {
        const current = await offerModel
          .findById(offerId)
          .session(session)
          .lean();
        return current?.categories;
      },
      async (assignment, session) => {
        const { unset_policy_category_id, ...set } =
          assignment as typeof assignment & {
            unset_policy_category_id?: true;
          };
        return offerModel.updateOne(
          { _id: offerId },
          {
            $set: set,
            ...(unset_policy_category_id
              ? { $unset: { policy_category_id: 1 } }
              : {}),
          },
          { session },
        );
      },
    );

    const cleared = await offerModel.findById(offerId).lean();
    expect(cleared?.policy_category_id).toBeUndefined();
    expect(cleared?.categories_normalized).toBeNull();
    const revision = Number(
      (await categoryModel.findById(categoryId).lean())?.revision,
    );
    await expect(
      service.retire(String(categoryId), {
        request_key: 'direct-only-retire',
        expected_revision: revision,
      }),
    ).resolves.toMatchObject({
      operation: 'retire',
      reference_counts: {
        offer_policy_category_id: 0,
        offer_categories_normalized: 0,
        unique_offers: 0,
      },
    });
  });

  it('resolves an Involve retained alias from another source without creating a second category', async () => {
    const categoryId = new Types.ObjectId();
    await categoryModel.create({
      _id: categoryId,
      name: 'Renamed Category',
      name_normalized: 'renamed category',
      lifecycle_status: 'active',
      revision: 4,
    });
    await sourceModel.create({
      category_id: categoryId,
      source: 'policy-admin',
      source_key: 'old category name',
      request_key: 'retained-cross-source',
      active: true,
      tombstoned: false,
      revision: 2,
    });

    const assignment = await service.withInvolveCategoryAssignment(
      'Old Category Name',
      async (resolved) => resolved,
    );

    expect(assignment).toEqual({
      categories_normalized: 'old category name',
    });
    await expect(categoryModel.countDocuments({})).resolves.toBe(1);
    await expect(
      categoryModel.findById(categoryId).lean(),
    ).resolves.toMatchObject({
      lifecycle_status: 'active',
      revision: 5,
    });
    await expect(
      sourceModel.countDocuments({ source_key: 'old category name' }),
    ).resolves.toBe(1);
  });

  it('replays delete-content once and journals only verified command-owned media', async () => {
    const categoryId = new Types.ObjectId();
    const asset = validAsset('delete-content');
    await categoryModel.create({
      _id: categoryId,
      name: 'Cleanup Category',
      name_normalized: 'cleanup category',
      lifecycle_status: 'active',
      revision: 1,
      icon_key: 'travel',
      banner: asset.url,
      banner_asset: asset,
      image: 'https://legacy.example/icon.png',
      image_asset: {
        provider: 'legacy-unverified',
        ownership: 'legacy-unverified',
        url: 'https://legacy.example/icon.png',
      },
    });
    await policyModel.create({
      category_id: categoryId,
      terms: { primary_locale: 'en', translations: { en: 'Terms' } },
    });

    const dto = {
      request_key: 'delete-content-replay',
      expected_revision: 1,
    };
    const first = await service.deleteContent(String(categoryId), dto);
    const replay = await service.deleteContent(String(categoryId), dto);
    expect(replay).toEqual(first);
    await expect(
      categoryModel.findById(categoryId).lean(),
    ).resolves.toMatchObject({
      icon_key: 'travel',
      image: 'https://legacy.example/icon.png',
      image_asset: expect.objectContaining({
        ownership: 'legacy-unverified',
        url: 'https://legacy.example/icon.png',
      }),
      lifecycle_status: 'active',
      revision: 2,
    });
    await expect(
      commandModel.countDocuments({ request_key: dto.request_key }),
    ).resolves.toBe(1);
    const cleanups = await cleanupModel
      .find({ request_key: dto.request_key })
      .lean();
    expect(cleanups).toHaveLength(1);
    expect(cleanups[0]?.asset.object_key).toBe(asset.object_key);
    await expect(
      service.deleteContent(String(categoryId), {
        request_key: dto.request_key,
        expected_revision: 2,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('quarantines an unverified legacy category replacement instead of risking physical deletion', async () => {
    const categoryId = new Types.ObjectId();
    const oldIcon = 'https://media.example/legacy-category-old.png';
    const newIcon = 'https://media.example/legacy-category-new.png';
    await categoryModel.create({
      _id: categoryId,
      name: 'Legacy Media Replace',
      name_normalized: 'legacy media replace',
      lifecycle_status: 'active',
      revision: 1,
      image: oldIcon,
    });

    await service.updateLegacyCategoryMetadata(String(categoryId), {
      image: newIcon,
    });

    await expect(
      categoryModel.findById(categoryId).lean(),
    ).resolves.toMatchObject({
      image: newIcon,
      revision: 2,
    });
    await expect(
      cleanupModel
        .findOne({ owner_type: 'category', owner_id: categoryId })
        .lean(),
    ).resolves.toMatchObject({
      reason: 'legacy-category-replaced',
      status: 'pending',
      reconciliation_required: true,
      last_error: expect.stringContaining(
        'Legacy/unverified media is retained',
      ),
      asset: expect.objectContaining({ url: oldIcon }),
    });
    expect(storedMedia.deleteStored).not.toHaveBeenCalled();
    expect(storedMedia.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('keeps unverified offer replacement cleanup quarantined even after every known reference is removed', async () => {
    const ownerId = new Types.ObjectId();
    const sharedReference = 'https://media.example/shared-offer-logo.png';
    await offerModel.collection.insertMany([
      {
        _id: ownerId,
        offer_id: 900020,
        source: 'manual',
        logo: sharedReference,
      } as never,
      {
        _id: new Types.ObjectId(),
        offer_id: 900021,
        source: 'manual',
        logo_desktop: sharedReference,
      } as never,
    ]);
    const session = await connection.startSession();
    await session.withTransaction(async () => {
      await mediaCleanup.journalLegacyReplacements(
        {
          owner_type: 'offer',
          owner_id: ownerId,
          request_key: 'shared-offer-cleanup',
          attempt_token: 'shared-offer-attempt',
          reason: 'offer-replaced',
          references: [sharedReference],
        },
        session,
      );
    });
    await session.endSession();

    await expect(
      mediaCleanup.processRequest('shared-offer-cleanup'),
    ).resolves.toEqual({ deleted: 0, pending: 1 });
    expect(storedMedia.deleteStored).not.toHaveBeenCalled();
    await expect(
      cleanupModel.findOne({ request_key: 'shared-offer-cleanup' }).lean(),
    ).resolves.toMatchObject({
      status: 'pending',
      reconciliation_required: true,
    });

    await offerModel.updateMany({}, { $unset: { logo: 1, logo_desktop: 1 } });
    await expect(
      mediaCleanup.processRequest('shared-offer-cleanup'),
    ).resolves.toEqual({ deleted: 0, pending: 0 });
    expect(storedMedia.deleteStored).not.toHaveBeenCalled();
    expect(storedMedia.deleteCommandOwnedStrict).not.toHaveBeenCalled();
    await expect(
      cleanupModel.findOne({ request_key: 'shared-offer-cleanup' }).lean(),
    ).resolves.toMatchObject({
      status: 'pending',
      reconciliation_required: true,
    });
  });

  it('keeps an Offer deletion asset pending while another global Offer reference remains', async () => {
    const categoryId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const sharedId = new Types.ObjectId();
    const asset = {
      ...validAsset('offer-delete-global-reference'),
      object_key: `brands/offer-delete-global-reference-0123456789abcdef/attempt-a-0123456789abcdef/${'a'.repeat(64)}.png`,
    };
    await registerAsset(asset);
    await commandModel.create({
      request_key: asset.owner_key,
      payload_hash: '9'.repeat(64),
      category_id: categoryId,
      operation: 'aggregate-save',
      status: 'committed',
      attempt_token: asset.owner_attempt_token,
      attempts: 1,
      planned_asset: asset,
    });
    await offerModel.collection.insertMany([
      {
        _id: ownerId,
        offer_id: 900025,
        source: 'manual',
        logo: asset.url,
        logo_asset: asset,
      } as never,
      {
        _id: sharedId,
        offer_id: 900026,
        source: 'manual',
        logo_desktop: asset.url,
      } as never,
    ]);
    const requestKey = `offer-delete:${ownerId}:v1`;
    const session = await connection.startSession();
    await session.withTransaction(async () => {
      await mediaCleanup.journalCommandOwnedAssets(
        {
          owner_type: 'offer',
          owner_id: ownerId,
          request_key: requestKey,
          payload_hash: '8'.repeat(64),
          attempt_token: requestKey,
          reason: 'content-delete',
          assets: [asset],
        },
        session,
      );
      await offerModel.deleteOne({ _id: ownerId }, { session });
    });
    await session.endSession();

    await expect(mediaCleanup.processRequest(requestKey)).resolves.toEqual({
      deleted: 0,
      pending: 1,
    });
    await expect(
      cleanupModel.findOne({ request_key: requestKey }).lean(),
    ).resolves.toMatchObject({
      status: 'pending',
      reconciliation_required: false,
      last_error: expect.stringContaining('still globally referenced'),
    });
    expect(storedMedia.deleteCommandOwnedStrict).not.toHaveBeenCalled();
    await expect(offerModel.findById(sharedId).lean()).resolves.toMatchObject({
      logo_desktop: asset.url,
    });
  });

  it('deletes a replaced command-owned asset only with exact committed ownership and no Brand reuse', async () => {
    const categoryId = new Types.ObjectId();
    const asset = validAsset('owned-category-replacement');
    await registerAsset(asset);
    await commandModel.create({
      request_key: asset.owner_key,
      payload_hash: 'b'.repeat(64),
      category_id: categoryId,
      operation: 'aggregate-save',
      status: 'committed',
      attempt_token: asset.owner_attempt_token,
      attempts: 1,
      planned_asset: asset,
    });
    await categoryModel.create({
      _id: categoryId,
      name: 'Owned Media Replace',
      name_normalized: 'owned media replace',
      lifecycle_status: 'active',
      revision: 1,
      image: asset.url,
      image_asset: asset,
    });

    await service.updateLegacyCategoryMetadata(String(categoryId), {
      image: 'https://media.example/new-owned-icon.png',
    });

    await expect(
      cleanupModel
        .findOne({ owner_type: 'category', owner_id: categoryId })
        .lean(),
    ).resolves.toMatchObject({
      reason: 'legacy-category-replaced',
      status: 'deleted',
      reconciliation_required: false,
      asset: expect.objectContaining({
        ownership: 'command-owned',
        object_key: asset.object_key,
      }),
    });
    expect(storedMedia.deleteCommandOwnedStrict).toHaveBeenCalledWith(
      expect.objectContaining({ object_key: asset.object_key }),
      'categories',
    );
  });

  it('serializes an Involve media displacement cleanup against a concurrent Offer reattachment', async () => {
    const categoryId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const asset = {
      ...validAsset('involve-race-displacement'),
      object_key: `brands/involve-race-displacement-0123456789abcdef/attempt-a-0123456789abcdef/${'a'.repeat(64)}.png`,
    };
    await registerAsset(asset);
    await commandModel.create({
      request_key: asset.owner_key,
      payload_hash: 'd'.repeat(64),
      category_id: categoryId,
      operation: 'aggregate-save',
      status: 'committed',
      attempt_token: asset.owner_attempt_token,
      attempts: 1,
      planned_asset: asset,
    });
    await offerModel.collection.insertOne({
      _id: ownerId,
      offer_id: 900030,
      source: 'involve',
      logo: asset.url,
      logo_asset: asset,
    } as never);
    const requestKey = 'involve-media-sync:900030:v1';
    const displacement = await connection.startSession();
    await displacement.withTransaction(async () => {
      await mediaCleanup.journalCommandOwnedAssets(
        {
          owner_type: 'offer',
          owner_id: ownerId,
          request_key: requestKey,
          payload_hash: 'e'.repeat(64),
          attempt_token: requestKey,
          reason: 'replaced-after-commit',
          assets: [asset],
        },
        displacement,
      );
      await offerModel.updateOne(
        { _id: ownerId },
        {
          $set: { logo: 'https://provider.example/replacement.png' },
          $unset: { logo_asset: 1 },
        },
        { session: displacement },
      );
    });
    await displacement.endSession();

    let enterDelete!: () => void;
    let releaseDelete!: () => void;
    const deleteEntered = new Promise<void>((resolve) => {
      enterDelete = resolve;
    });
    const deleteBlocked = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    storedMedia.deleteCommandOwnedStrict.mockImplementationOnce(async () => {
      enterDelete();
      await deleteBlocked;
    });
    const cleanup = mediaCleanup.processRequest(requestKey);
    await deleteEntered;

    const reattach = await connection.startSession();
    await expect(
      reattach.withTransaction(async () => {
        await registryService.touchAttachInSession(asset.url, reattach);
        await offerModel.create(
          [
            {
              _id: new Types.ObjectId(),
              offer_id: 900031,
              source: 'involve',
              logo: asset.url,
            },
          ],
          { session: reattach },
        );
      }),
    ).rejects.toMatchObject({ status: 409 });
    await reattach.endSession();

    releaseDelete();
    await expect(cleanup).resolves.toEqual({ deleted: 1, pending: 0 });
    await expect(offerModel.findById(ownerId).lean()).resolves.toMatchObject({
      logo: 'https://provider.example/replacement.png',
    });
    await expect(
      registryModel.findOne({ url: asset.url }).lean(),
    ).resolves.toMatchObject({ state: 'deleted' });
    await expect(
      offerModel.findOne({ offer_id: 900031 }).lean(),
    ).resolves.toBeNull();
  });

  it('retains an exact command-owned category asset while Brand still shares its URL', async () => {
    const categoryId = new Types.ObjectId();
    const asset = validAsset('brand-shared-owned-category');
    await registerAsset(asset);
    await commandModel.create({
      request_key: asset.owner_key,
      payload_hash: 'c'.repeat(64),
      category_id: categoryId,
      operation: 'aggregate-save',
      status: 'committed',
      attempt_token: asset.owner_attempt_token,
      attempts: 1,
      planned_asset: asset,
    });
    await categoryModel.create({
      _id: categoryId,
      name: 'Brand Shared Owned Media',
      name_normalized: 'brand shared owned media',
      lifecycle_status: 'active',
      revision: 1,
      image: asset.url,
      image_asset: asset,
    });
    await brandModel.create({
      brand_name: 'Shared Media Brand',
      brand_slug: `shared-media-${categoryId}`,
      logo: asset.url,
    });

    await service.updateLegacyCategoryMetadata(String(categoryId), {
      image: 'https://media.example/new-brand-shared-icon.png',
    });

    await expect(
      cleanupModel
        .findOne({ owner_type: 'category', owner_id: categoryId })
        .lean(),
    ).resolves.toMatchObject({
      status: 'pending',
      reconciliation_required: false,
      last_error: expect.stringContaining('still globally referenced'),
    });
    expect(storedMedia.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('replays two concurrent identical lifecycle deliveries with one revision', async () => {
    const categoryId = new Types.ObjectId();
    await categoryModel.create({
      _id: categoryId,
      name: 'Concurrent Replay',
      name_normalized: 'concurrent replay',
      lifecycle_status: 'active',
      revision: 1,
    });
    const dto = {
      request_key: 'concurrent-delete-replay',
      expected_revision: 1,
    };

    const [first, second] = await Promise.all([
      service.deleteContent(String(categoryId), dto),
      service.deleteContent(String(categoryId), dto),
    ]);
    expect(second).toEqual(first);
    await expect(
      categoryModel.findById(categoryId).lean(),
    ).resolves.toMatchObject({
      revision: 2,
      lifecycle_status: 'active',
    });
    await expect(
      commandModel.countDocuments({ request_key: dto.request_key }),
    ).resolves.toBe(1);
  });

  it('returns a controlled 409 for concurrent operations sharing one request key', async () => {
    const categoryId = new Types.ObjectId();
    await categoryModel.create({
      _id: categoryId,
      name: 'Concurrent Conflict',
      name_normalized: 'concurrent conflict',
      lifecycle_status: 'active',
      revision: 1,
    });
    const requestKey = 'concurrent-operation-conflict';

    const results = await Promise.allSettled([
      service.deleteContent(String(categoryId), {
        request_key: requestKey,
        expected_revision: 1,
      }),
      service.retire(String(categoryId), {
        request_key: requestKey,
        expected_revision: 1,
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected).toBeDefined();
    if (!rejected) {
      throw new Error('Expected one conflicting lifecycle command to reject.');
    }
    expect(rejected.reason).toMatchObject({ status: 409 });
    expect((rejected.reason as Error).message).not.toMatch(
      /E11000|duplicate key/i,
    );
    await expect(
      commandModel.countDocuments({ request_key: requestKey }),
    ).resolves.toBe(1);
  });

  it('retire-to-purge retains tombstones and prevents Involve resurrection', async () => {
    const categoryId = new Types.ObjectId();
    const iconAsset = validAsset('retired-category-icon');
    await categoryModel.create({
      _id: categoryId,
      name: 'Retired Forever',
      name_normalized: 'retired forever',
      lifecycle_status: 'active',
      revision: 1,
      image: iconAsset.url,
      image_asset: iconAsset,
    });
    await sourceModel.create({
      category_id: categoryId,
      source: 'legacy',
      source_key: 'retired forever',
      request_key: 'retire-source',
      active: true,
      tombstoned: false,
      revision: 1,
    });

    await service.retire(String(categoryId), {
      request_key: 'retire-command',
      expected_revision: 1,
    });
    await categoryModel.updateOne(
      { _id: categoryId },
      { $set: { purge_after: new Date(Date.now() - 1_000) } },
    );
    await service.purge(String(categoryId), {
      request_key: 'purge-command',
      expected_revision: 2,
    });

    expect(await categoryModel.findById(categoryId).lean()).toBeNull();
    await expect(
      cleanupModel.findOne({
        request_key: 'purge-command',
        reason: 'category-purge',
      }),
    ).resolves.toMatchObject({
      status: 'pending',
      asset: expect.objectContaining({ object_key: iconAsset.object_key }),
    });
    await expect(
      sourceModel.findOne({ category_id: categoryId }).lean(),
    ).resolves.toMatchObject({
      active: false,
      tombstoned: true,
      purged_at: expect.any(Date),
    });

    const assignment = await service.withInvolveCategoryAssignment(
      'Retired Forever',
      async (resolved, session) => {
        await offerModel.collection.insertOne(
          {
            _id: new Types.ObjectId(),
            offer_id: 900002,
            source: 'involve',
            categories: 'Retired Forever',
            ...resolved,
          } as never,
          { session },
        );
        return resolved;
      },
    );
    expect(assignment).toEqual({ categories_normalized: null });
    expect(
      await categoryModel.countDocuments({
        name_normalized: 'retired forever',
      }),
    ).toBe(0);
  });

  it('migration acquisition waits for the transactional writer marker fence', async () => {
    const session = await connection.startSession();
    let entered!: () => void;
    let release!: () => void;
    const enteredFence = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const releaseFence = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = session.withTransaction(async () => {
      await service.fenceReady(session);
      entered();
      await releaseFence;
    });
    await enteredFence;

    const migration = runPolicyCategoryIntegrityMigration({
      db: connection.db,
      mode: 'apply',
    });
    const early = await Promise.race([
      migration.then(() => 'completed'),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('blocked'), 150),
      ),
    ]);
    expect(early).toBe('blocked');
    release();
    await writer;
    await session.endSession();
    await expect(migration).resolves.toMatchObject({ mode: 'apply' });
    await expect(service.assertReady(true)).resolves.toBeUndefined();
  });
});
