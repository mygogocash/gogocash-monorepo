import { MongoClient, ObjectId } from 'mongodb';

import {
  buildMissingOrdersMigrationCasFilter,
  createMongooseMissingOrdersCliRuntime,
  type MissingOrdersCliRuntime,
} from './missing-orders.cli';
import {
  type MissingOrdersMigrationStore,
  runMissingOrdersMigration,
} from './missing-orders.migration';

const mongoUri = process.env.MISSING_ORDERS_NATIVE_MONGO_URI;
const describeNativeMongo = mongoUri ? describe : describe.skip;

describeNativeMongo(
  'missing-orders migration CAS against native MongoDB',
  () => {
    let client: MongoClient;
    let runtime: MissingOrdersCliRuntime;

    beforeAll(async () => {
      client = new MongoClient(mongoUri!);
      await client.connect();
      runtime = createMongooseMissingOrdersCliRuntime();
      await runtime.connect(mongoUri!);
    });

    afterAll(async () => {
      if (client) {
        await client.db().dropDatabase();
        await client.close();
      }
      if (runtime) await runtime.disconnect();
    });

    it('refuses to replace a timestamp-less row changed and extended after its preimage read', async () => {
      const buildInfo = await client.db('admin').command({ buildInfo: 1 });
      expect(buildInfo.version).toBe('8.2.6');

      const database = client.db();
      const missionorders = database.collection('missionorders');
      const userId = new ObjectId();
      const offerId = new ObjectId();
      const claimId = new ObjectId();

      await database.collection('users').insertOne({
        _id: userId,
        username: 'CAS Customer',
        email: null,
        mobile: '+66812345678',
      });
      await database.collection('offers').insertOne({
        _id: offerId,
        source: 'involve',
        offer_id: 351,
        offer_name: 'CAS Store',
      });
      await missionorders.insertOne({
        _id: claimId,
        user_id: userId,
        offer_id: offerId,
        orderId: 'ORDER-BEFORE',
        purchaseDate: '2026-07-17',
        amount: '250.50',
        note: 'before',
        attachments: ['private://before.jpg'],
        status: 'pending',
      });

      const exactPreimage = await missionorders.findOne({ _id: claimId });
      expect(exactPreimage).not.toBeNull();
      const exactFilter = buildMissingOrdersMigrationCasFilter(
        claimId,
        exactPreimage!,
      );
      await expect(missionorders.countDocuments(exactFilter)).resolves.toBe(1);

      await missionorders.updateOne(
        { _id: claimId },
        {
          $set: {
            orderId: 'ORDER-CHANGED-VALUE',
            note: 'changed value',
            attachments: ['private://changed-value.jpg'],
          },
        },
      );
      await expect(missionorders.countDocuments(exactFilter)).resolves.toBe(0);
      await missionorders.updateOne(
        { _id: claimId },
        {
          $set: {
            orderId: 'ORDER-BEFORE',
            note: 'before',
            attachments: ['private://before.jpg'],
          },
        },
      );
      await expect(missionorders.countDocuments(exactFilter)).resolves.toBe(1);
      await missionorders.updateOne(
        { _id: claimId },
        { $set: { added_key_only: true } },
      );
      await expect(missionorders.countDocuments(exactFilter)).resolves.toBe(0);
      await missionorders.updateOne(
        { _id: claimId },
        { $unset: { added_key_only: '' } },
      );
      await expect(missionorders.countDocuments(exactFilter)).resolves.toBe(1);

      const nativeStore = runtime.createMigrationStore();
      let replacementMatched: boolean | undefined;
      const store: MissingOrdersMigrationStore = {
        ...nativeStore,
        async replaceCanonical(id, document, preimage) {
          await missionorders.updateOne(
            { _id: claimId },
            {
              $set: {
                orderId: 'ORDER-CONCURRENT',
                note: 'concurrent note',
                attachments: ['private://concurrent.jpg'],
                added_after_read: { writer: 'customer' },
              },
            },
          );
          await expect(missionorders.countDocuments(exactFilter)).resolves.toBe(
            0,
          );
          replacementMatched = await nativeStore.replaceCanonical(
            id,
            document,
            preimage,
          );
          return replacementMatched;
        },
      };

      const report = await runMissingOrdersMigration(store, {
        apply: true,
        now: new Date('2026-07-17T06:00:00.000Z'),
        runId: 'native-exact-preimage-cas',
      });

      expect(report.applied).toMatchObject({
        updated: 0,
        skipped: 1,
        errors: 0,
      });
      expect(report.conflicts).toContainEqual(
        expect.objectContaining({
          canonicalId: claimId.toHexString(),
          reason: 'concurrent_write_conflict',
        }),
      );
      expect(replacementMatched).toBe(false);
      expect(report.rollback.changes).toHaveLength(1);
      expect(report.rollback.changes[0]).toEqual(
        expect.objectContaining({
          canonicalId: claimId.toHexString(),
          operation: 'restore_replaced',
          journalState: 'not_applied',
        }),
      );
      await expect(
        missionorders.findOne({ _id: claimId }),
      ).resolves.toMatchObject({
        orderId: 'ORDER-CONCURRENT',
        note: 'concurrent note',
        attachments: ['private://concurrent.jpg'],
        added_after_read: { writer: 'customer' },
        status: 'pending',
      });
    });
  },
);
