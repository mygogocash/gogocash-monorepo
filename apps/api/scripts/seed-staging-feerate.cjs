const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[seed-staging-feerate] MONGO_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db.databaseName;
  const col = mongoose.connection.collection('feerates');
  const now = new Date();
  const result = await col.updateOne(
    {},
    {
      $set: {
        system: 5,
        store: 5,
        max_cap: 100_000,
        fee_withdraw_thb: 0,
        fee_withdraw_usd: 0,
        minimum_withdraw_thb: 1,
        minimum_withdraw_usd: 1,
        updatedAt: now,
        createdAt: now,
      },
    },
    { upsert: true },
  );
  const doc = await col.findOne({});
  console.log(
    JSON.stringify({
      db,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      id: doc?._id?.toString() ?? null,
    }),
  );
  await mongoose.disconnect();
})().catch((error) => {
  console.error('[seed-staging-feerate]', error.message);
  process.exit(1);
});
