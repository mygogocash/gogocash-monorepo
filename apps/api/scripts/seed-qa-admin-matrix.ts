/**
 * Seed QA fixtures for admin Create Role domains, anchored to a customer user.
 *
 * Covers: withdraw, conversion, fee, brands, banner, catalog, inventory,
 * orders, payments, coupon, quest, missing-orders — enough rows for each
 * admin page to be non-empty. Dashboard is exercised via aggregates.
 *
 * Usage (staging — requires explicit environment, database, and confirmation):
 *   Staging MONGO_URI is internal-only. Either:
 *   SSH into the staging gogocash-api service so Railway supplies the verified
 *   staging environment marker and the mongo-staging internal hostname. Then:
 *     QA_USER_ID=6a5b5a2b3ed0b51d9e113ccf QA_USERNAME=fronk98 \
 *       npm run seed:qa-admin-matrix -w gogocash-api -- \
 *         --environment=staging --expected-db=test \
 *         --confirm-staging=SEED-QA-MATRIX-STAGING --dry-run
 *   Remove --dry-run only after checking the target summary.
 *
 * Local:
 *   MONGO_URI=mongodb://127.0.0.1:27017/gogocash \
 *     npm run seed:qa-admin-matrix -w gogocash-api -- --expected-db=gogocash
 *
 * Idempotent: deletes prior QA-MATRIX-tagged rows / conversion_id range
 * 910000000–910000999 for the target user before re-inserting.
 *
 * Admin QA after seed: /conversion, /withdraw, /brands, /banner, /coupon,
 * /quest, /catalog, /orders, /payments, /dashboard — filter by fronk98 /
 * QA-MATRIX. Customer wallet should show balance from approved conversions.
 */
import 'dotenv/config';
import mongoose, { Model, Types } from 'mongoose';

import {
  CatalogBanner,
  CatalogBannerSchema,
} from '../src/catalog/schemas/catalog-banner.schema';
import {
  CatalogProduct,
  CatalogProductSchema,
} from '../src/catalog/schemas/catalog-product.schema';
import {
  CommerceOrder,
  CommerceOrderSchema,
} from '../src/catalog/schemas/order.schema';
import {
  PaymentAttempt,
  PaymentAttemptSchema,
} from '../src/catalog/schemas/payment-attempt.schema';
import {
  ALL_BRAND_BANNER_COLLECTION,
  ALL_BRAND_BANNER_MODEL,
  Banner,
  BannerSchema,
} from '../src/offer/schemas/banner.schema';
import { Coupon, CouponSchema } from '../src/offer/schemas/coupon.schema';
import {
  MissionOrder,
  MissionOrderSchema,
} from '../src/offer/schemas/missing-order.schema';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import { Quest, QuestSchema } from '../src/point/schemas/quest.schema';
import { User, UserSchema } from '../src/user/schemas/user.schema';
import {
  Conversion,
  ConversionSchema,
} from '../src/withdraw/schemas/conversion.schema';
import {
  Withdraw,
  WithdrawSchema,
} from '../src/withdraw/schemas/withdraw.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from '../src/withdraw/schemas/withdrawMethod.schema';
import {
  QA_STAGING_CONFIRMATION,
  QaSeedEnvironment,
  assertConnectedQaDatabase,
  assertQaSeedTarget,
} from '../src/admin/qa-seed/qa-seed-safety';

const QA_TAG = 'QA-MATRIX';
const CONVERSION_ID_MIN = 910_000_000;
const CONVERSION_ID_MAX = 910_000_999;
const OFFER_ENABLED_ID = 910_001;
const OFFER_DISABLED_ID = 910_002;
const OFFER_PENDING_ID = 910_003;

const DEFAULT_USER_ID = '6a5b5a2b3ed0b51d9e113ccf';
const DEFAULT_USERNAME = 'fronk98';

type SeedCounts = Record<string, number>;

type SeedQaAdminMatrixOptions = {
  userId: string;
  username: string;
  environment: QaSeedEnvironment;
  expectedDatabase: string;
  confirmation?: string;
  platformEnvironment?: string;
  dryRun: boolean;
};

function optionValue(argv: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const equalsValue = argv.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsValue) return equalsValue.slice(equalsPrefix.length).trim();
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1]?.trim() : undefined;
}

export function parseArgs(argv: string[]): SeedQaAdminMatrixOptions {
  if (argv.includes('--force')) {
    throw new Error(
      `--force is not supported; select --environment, --expected-db, and ${QA_STAGING_CONFIRMATION} explicitly`,
    );
  }
  let userId =
    process.env.QA_USER_ID?.trim() ||
    process.env.USER_ID?.trim() ||
    DEFAULT_USER_ID;
  let username = process.env.QA_USERNAME?.trim() || DEFAULT_USERNAME;

  userId = optionValue(argv, '--user-id') || userId;
  username = optionValue(argv, '--username') || username;

  const rawEnvironment =
    optionValue(argv, '--environment') ||
    process.env.QA_SEED_ENVIRONMENT?.trim() ||
    'local';
  if (rawEnvironment !== 'local' && rawEnvironment !== 'staging') {
    throw new Error('--environment must be local or staging');
  }
  const expectedDatabase =
    optionValue(argv, '--expected-db') ||
    process.env.QA_EXPECTED_DATABASE?.trim() ||
    '';
  const confirmation =
    optionValue(argv, '--confirm-staging') ||
    process.env.QA_STAGING_CONFIRMATION?.trim();

  if (!Types.ObjectId.isValid(userId)) {
    throw new Error(`Invalid USER_ID / --user-id: ${userId}`);
  }

  return {
    userId,
    username,
    environment: rawEnvironment,
    expectedDatabase,
    confirmation,
    platformEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME?.trim(),
    dryRun: argv.includes('--dry-run'),
  };
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function modelOf<T>(name: string, schema: mongoose.Schema): Model<T> {
  return (mongoose.models[name] || mongoose.model(name, schema)) as Model<T>;
}

function uniqueTxHash(suffix: string): string {
  const pad = `qa${suffix}`.padEnd(64, '0').slice(0, 64);
  return `0x${pad}`;
}

export async function seedQaAdminMatrix(
  mongoUri: string,
  options: SeedQaAdminMatrixOptions,
): Promise<SeedCounts> {
  assertQaSeedTarget(mongoUri, options);
  await mongoose.connect(mongoUri);
  assertConnectedQaDatabase(
    mongoose.connection.db?.databaseName,
    options.expectedDatabase,
  );

  const counts: SeedCounts = {};
  const userOid = new Types.ObjectId(options.userId);
  const affSub1 = `user_id:${options.userId}`;

  const UserModel = modelOf<User>(User.name, UserSchema);
  const ConversionModel = modelOf<Conversion>(
    Conversion.name,
    ConversionSchema,
  );
  const WithdrawModel = modelOf<Withdraw>(Withdraw.name, WithdrawSchema);
  const MethodModel = modelOf<WithdrawMethod>(
    WithdrawMethod.name,
    WithdrawMethodSchema,
  );
  const OfferModel = modelOf<Offer>(Offer.name, OfferSchema);
  const BannerModel = modelOf<Banner>(Banner.name, BannerSchema);
  const AllBrandBannerModel =
    (mongoose.models[ALL_BRAND_BANNER_MODEL] as Model<Banner>) ||
    mongoose.model(
      ALL_BRAND_BANNER_MODEL,
      BannerSchema,
      ALL_BRAND_BANNER_COLLECTION,
    );
  const CouponModel = modelOf<Coupon>(Coupon.name, CouponSchema);
  const QuestModel = modelOf<Quest>(Quest.name, QuestSchema);
  const CatalogModel = modelOf<CatalogProduct>(
    CatalogProduct.name,
    CatalogProductSchema,
  );
  const CatalogBannerModel = modelOf<CatalogBanner>(
    CatalogBanner.name,
    CatalogBannerSchema,
  );
  const OrderModel = modelOf<CommerceOrder>(
    CommerceOrder.name,
    CommerceOrderSchema,
  );
  const PaymentModel = modelOf<PaymentAttempt>(
    PaymentAttempt.name,
    PaymentAttemptSchema,
  );
  const MissionOrderModel = modelOf<MissionOrder>(
    MissionOrder.name,
    MissionOrderSchema,
  );

  try {
    const user = await UserModel.findById(userOid).lean();
    if (!user) {
      throw new Error(
        `User not found: _id=${options.userId}. Create/login as ${options.username} first.`,
      );
    }

    const usernameMatch =
      typeof user.username === 'string' &&
      user.username.toLowerCase() === options.username.toLowerCase();
    if (!usernameMatch) {
      throw new Error(
        `User ${options.userId} username=${String(user.username)} does not match expected ${options.username}`,
      );
    }
    console.log(
      `[seed-qa-admin-matrix] target user ok username=${options.username} _id=${options.userId}`,
    );

    if (options.dryRun) {
      console.log(
        `[seed-qa-admin-matrix] dry-run target db=${mongoose.connection.db?.databaseName} user=${options.userId}; no writes performed`,
      );
      return { dry_run: 1 };
    }

    // --- wipe prior QA rows ---
    const convDel = await ConversionModel.deleteMany({
      $and: [
        { $or: [{ user_id: userOid }, { aff_sub1: affSub1 }] },
        {
          $or: [
            {
              conversion_id: {
                $gte: CONVERSION_ID_MIN,
                $lte: CONVERSION_ID_MAX,
              },
            },
            { offer_name: { $regex: `^${QA_TAG}` } },
          ],
        },
      ],
    });
    counts.conversions_deleted = convDel.deletedCount ?? 0;

    const wdDel = await WithdrawModel.deleteMany({
      user_id: userOid,
      $or: [
        { account_name: { $regex: `^${QA_TAG}` } },
        { address: { $regex: `^0xQA` } },
        { flag_reason: { $regex: QA_TAG } },
      ],
    });
    counts.withdraws_deleted = wdDel.deletedCount ?? 0;

    await MissionOrderModel.deleteMany({
      seed_marker: QA_TAG,
      user_id: userOid,
    });
    await OrderModel.deleteMany({
      user_id: options.userId,
      order_number: { $regex: `^${QA_TAG}` },
    });
    await PaymentModel.deleteMany({
      user_id: options.userId,
      idempotency_key: { $regex: `^${QA_TAG}` },
    });
    await CouponModel.deleteMany({ name: { $regex: `^${QA_TAG}` } });
    await CatalogModel.deleteMany({ slug: { $regex: `^qa-matrix-` } });
    await CatalogBannerModel.deleteMany({ title: { $regex: `^${QA_TAG}` } });
    await QuestModel.deleteMany({
      $or: [
        { qa_marker: QA_TAG },
        { banner_en: { $regex: `^${QA_TAG}` } },
        { 'tasks.wording': { $regex: QA_TAG } },
      ],
    });
    await BannerModel.deleteMany({ link_1: { $regex: QA_TAG } });
    await AllBrandBannerModel.deleteMany({ link_1: { $regex: QA_TAG } });

    // --- BRANDS ---
    const enabledBrand = await OfferModel.findOneAndUpdate(
      { source: 'manual', offer_id: OFFER_ENABLED_ID },
      {
        $set: {
          source: 'manual',
          offer_id: OFFER_ENABLED_ID,
          merchant_id: OFFER_ENABLED_ID,
          offer_name: `${QA_TAG} Enabled Brand`,
          offer_name_display: `${QA_TAG} Enabled Brand`,
          lookup_value: 'qa-matrix-enabled',
          disabled: false,
          status: 'approved',
          countries: 'TH',
          currency: 'THB',
          commissions: [{ Commission: '5.00%' }],
          commission_store: 5,
          tracking_link: 'https://example.com/qa-matrix-enabled',
        },
      },
      { upsert: true, new: true },
    );
    const disabledBrand = await OfferModel.findOneAndUpdate(
      { source: 'manual', offer_id: OFFER_DISABLED_ID },
      {
        $set: {
          source: 'manual',
          offer_id: OFFER_DISABLED_ID,
          merchant_id: OFFER_DISABLED_ID,
          offer_name: `${QA_TAG} Disabled Brand`,
          offer_name_display: `${QA_TAG} Disabled Brand`,
          lookup_value: 'qa-matrix-disabled',
          disabled: true,
          status: 'approved',
          countries: 'TH',
          currency: 'THB',
          commissions: [{ Commission: '3.00%' }],
          tracking_link: 'https://example.com/qa-matrix-disabled',
        },
      },
      { upsert: true, new: true },
    );
    await OfferModel.findOneAndUpdate(
      { source: 'manual', offer_id: OFFER_PENDING_ID },
      {
        $set: {
          source: 'manual',
          offer_id: OFFER_PENDING_ID,
          merchant_id: OFFER_PENDING_ID,
          offer_name: `${QA_TAG} Pending Brand`,
          offer_name_display: `${QA_TAG} Pending Brand`,
          lookup_value: 'qa-matrix-pending',
          disabled: false,
          status: 'pending_review',
          countries: 'TH',
          currency: 'THB',
          commissions: [{ Commission: '4.00%' }],
          tracking_link: 'https://example.com/qa-matrix-pending',
        },
      },
      { upsert: true, new: true },
    );
    counts.offers = 3;

    // --- CONVERSIONS ---
    const now = new Date();
    const conversionDocs = [
      {
        conversion_id: 910_000_001,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Pending Involve`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'pending',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 1500,
        payout: 150,
        base_payout: 150,
        bonus_payout: 0,
        provider_conversion_id: 'qa-matrix-pending-1',
        provider_account: 'default',
      },
      {
        conversion_id: 910_000_002,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Approved Involve`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'approved',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 5000,
        payout: 500,
        base_payout: 500,
        bonus_payout: 0,
        provider_conversion_id: 'qa-matrix-approved-1',
        provider_account: 'default',
      },
      {
        conversion_id: 910_000_003,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Rejected Involve`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'rejected',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 800,
        payout: 80,
        provider_conversion_id: 'qa-matrix-rejected-1',
        provider_account: 'default',
      },
      {
        conversion_id: 910_000_004,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Paid Involve`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'paid',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 1200,
        payout: 120,
        provider_conversion_id: 'qa-matrix-paid-1',
        provider_account: 'default',
      },
      {
        conversion_id: 910_000_005,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Optimise Approved`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'optimise',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'approved',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 3000,
        payout: 300,
        provider_conversion_id: 'qa-matrix-opt-1',
        provider_account: 'qa-opt-account',
        network_account: 'qa-opt-pub',
      },
      {
        conversion_id: 910_000_006,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Accesstrade Pending`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'accesstrade',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'pending',
        datetime_conversion: now,
        currency: 'USD',
        sale_amount: 40,
        payout: 4,
        provider_conversion_id: 'qa-matrix-act-1',
        provider_account: 'qa-act-account',
      },
      {
        conversion_id: 910_000_007,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Flagged`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'approved',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 900,
        payout: 90,
        flagged: true,
        provider_conversion_id: 'qa-matrix-flagged-1',
        provider_account: 'default',
      },
      {
        conversion_id: 910_000_008,
        offer_id: OFFER_ENABLED_ID,
        offer_name: 'reward_conversion_quest',
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'approved',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 0,
        payout: 50,
        quest_synthetic_reward: true,
        provider_conversion_id: 'qa-matrix-quest-reward-1',
        provider_account: 'default',
      },
      {
        // Orphan aff_sub1 (no user_id) — backfill / attribution edge case
        conversion_id: 910_000_009,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Orphan AffSub`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        conversion_status: 'approved',
        datetime_conversion: now,
        currency: 'THB',
        sale_amount: 600,
        payout: 60,
        provider_conversion_id: 'qa-matrix-orphan-1',
        provider_account: 'default',
      },
      {
        conversion_id: 910_000_010,
        offer_id: OFFER_ENABLED_ID,
        offer_name: `${QA_TAG} Approved USD`,
        merchant_id: OFFER_ENABLED_ID,
        source: 'involve',
        aff_sub1: affSub1,
        user_id: userOid,
        conversion_status: 'approved',
        datetime_conversion: now,
        currency: 'USD',
        sale_amount: 25,
        payout: 5,
        provider_conversion_id: 'qa-matrix-usd-1',
        provider_account: 'default',
      },
    ];
    await ConversionModel.insertMany(conversionDocs);
    counts.conversions = conversionDocs.length;

    // --- WITHDRAW METHOD ---
    await MethodModel.findOneAndUpdate(
      { user_id: userOid, account_no: '9100000001' },
      {
        $set: {
          user_id: userOid,
          account_name: `${QA_TAG}-${options.username}`,
          bank_name: 'Kasikorn Bank',
          account_no: '9100000001',
          bank_code: '004',
          is_default: true,
        },
      },
      { upsert: true, new: true },
    );
    counts.withdrawmethods = 1;

    // --- WITHDRAWS ---
    const withdrawDocs = [
      {
        user_id: userOid,
        status: 'pending',
        method: 'bank_transfer',
        currency: 'THB',
        amount_total: 100,
        amount_net: 100,
        percent_fee: 0,
        conversion_id: [910_000_002],
        account_name: `${QA_TAG}-${options.username}`,
        bank_name: 'Kasikorn Bank',
        account_number: '9100000001',
        address: '',
        tx_hash: '',
        withdraw_mode: 'auto' as const,
      },
      {
        user_id: userOid,
        status: 'approved',
        method: 'bank_transfer',
        currency: 'THB',
        amount_total: 200,
        amount_net: 200,
        percent_fee: 0,
        conversion_id: [910_000_004],
        account_name: `${QA_TAG}-${options.username}`,
        bank_name: 'Kasikorn Bank',
        account_number: '9100000001',
        address: '',
        tx_hash: '',
        slip_file: 'local-media:qa-matrix/slip.png',
        withdraw_mode: 'auto' as const,
        approved_by: 'qa-admin',
        approved_at: now,
      },
      {
        user_id: userOid,
        status: 'rejected',
        method: 'bank_transfer',
        currency: 'THB',
        amount_total: 50,
        amount_net: 50,
        percent_fee: 0,
        conversion_id: [],
        account_name: `${QA_TAG}-${options.username}`,
        bank_name: 'Siam Commercial Bank',
        account_number: '9100000002',
        address: '',
        tx_hash: '',
        withdraw_mode: 'auto' as const,
      },
      {
        user_id: userOid,
        status: 'pending',
        method: 'on_chain',
        currency: 'USDT',
        amount_total: 15,
        amount_net: 15,
        percent_fee: 0,
        conversion_id: [],
        account_name: `${QA_TAG}-${options.username}`,
        address: '0xQAmatrixpending00000000000000000000000001',
        tx_hash: '',
        withdraw_mode: 'auto' as const,
      },
      {
        user_id: userOid,
        status: 'approved',
        method: 'on_chain',
        currency: 'USDT',
        amount_total: 25,
        amount_net: 25,
        percent_fee: 0,
        conversion_id: [],
        account_name: `${QA_TAG}-${options.username}`,
        address: '0xQAmatrixapproved0000000000000000000000002',
        tx_hash: uniqueTxHash('approved01'),
        withdraw_mode: 'auto' as const,
        approved_by: 'qa-admin',
        approved_at: now,
      },
      {
        user_id: userOid,
        status: 'pending',
        method: 'minipay_manual',
        currency: 'USDC',
        amount_total: 12,
        amount_net: 12,
        percent_fee: 0,
        conversion_id: [],
        account_name: `${QA_TAG}-${options.username}`,
        address: '0xQAmatrixmanualpending00000000000000000003',
        tx_hash: '',
        withdraw_mode: 'manual' as const,
        chain: 'CELO',
      },
      {
        user_id: userOid,
        status: 'paid',
        method: 'minipay_manual',
        currency: 'USDC',
        amount_total: 18,
        amount_net: 18,
        percent_fee: 0,
        conversion_id: [],
        account_name: `${QA_TAG}-${options.username}`,
        address: '0xQAmatrixmanualpaid00000000000000000000004',
        tx_hash: uniqueTxHash('paid000001'),
        withdraw_mode: 'manual' as const,
        chain: 'CELO',
        paid_by: 'qa-admin',
        paid_at: now,
      },
      {
        user_id: userOid,
        status: 'pending',
        method: 'bank_transfer',
        currency: 'THB',
        amount_total: 75,
        amount_net: 75,
        percent_fee: 0,
        conversion_id: [910_000_007],
        account_name: `${QA_TAG}-${options.username}`,
        bank_name: 'Bangkok Bank',
        account_number: '9100000003',
        address: '',
        tx_hash: '',
        withdraw_mode: 'auto' as const,
        flagged: true,
        flag_reason: `${QA_TAG} suspicious payout pattern`,
      },
    ];
    await WithdrawModel.insertMany(withdrawDocs);
    counts.withdraws = withdrawDocs.length;

    // --- BANNERS ---
    await BannerModel.create({
      start_date: isoDaysFromNow(-7),
      end_date: isoDaysFromNow(30),
      link_1: `https://example.com/${QA_TAG}-home-active`,
      image_1: 'https://media-staging.gogocash.co/qa-matrix/banner-active.png',
      enabled_1: true,
      start_date_1: isoDaysFromNow(-7),
      end_date_1: isoDaysFromNow(30),
    });
    await BannerModel.create({
      start_date: isoDaysFromNow(-60),
      end_date: isoDaysFromNow(-30),
      link_1: `https://example.com/${QA_TAG}-home-expired`,
      image_1: 'https://media-staging.gogocash.co/qa-matrix/banner-expired.png',
      enabled_1: true,
      start_date_1: isoDaysFromNow(-60),
      end_date_1: isoDaysFromNow(-30),
    });
    await AllBrandBannerModel.create({
      start_date: isoDaysFromNow(-7),
      end_date: isoDaysFromNow(30),
      link_1: `https://example.com/${QA_TAG}-all-brand`,
      image_1: 'https://media-staging.gogocash.co/qa-matrix/all-brand.png',
      enabled_1: true,
    });
    counts.banners = 3;

    // --- COUPONS ---
    await CouponModel.create({
      name: `${QA_TAG} Visible Code`,
      code: 'QAMATRIX10',
      code_enabled: true,
      offer_id: enabledBrand._id,
      start_date: isoDaysFromNow(-7),
      end_date: isoDaysFromNow(30),
      discount: 10,
      discount_type: 'percent',
      discount_currency: 'THB',
      eligibility: 'all users',
      quantity: 100,
      quantity_used: 0,
      disabled: false,
    });
    await CouponModel.create({
      name: `${QA_TAG} Link Only`,
      code: '',
      code_enabled: false,
      offer_id: enabledBrand._id,
      start_date: isoDaysFromNow(-7),
      end_date: isoDaysFromNow(30),
      discount: 50,
      discount_type: 'cash',
      discount_currency: 'THB',
      eligibility: 'all users',
      quantity: 20,
      quantity_used: 0,
      disabled: false,
    });
    await CouponModel.create({
      name: `${QA_TAG} Expired Exhausted`,
      code: 'QAEXPIRED',
      code_enabled: true,
      offer_id: enabledBrand._id,
      start_date: isoDaysFromNow(-60),
      end_date: isoDaysFromNow(-1),
      discount: 15,
      discount_type: 'percent',
      discount_currency: 'THB',
      eligibility: 'all users',
      quantity: 5,
      quantity_used: 5,
      disabled: false,
    });
    counts.coupons = 3;

    // --- QUEST ---
    await QuestModel.create({
      qa_marker: QA_TAG,
      start_date: now,
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'open',
      reward_status: false,
      reward_distribution_mode: 'campaign_end',
      reward_distribution_delay_days: 0,
      banner_en: `${QA_TAG} Open Quest`,
      banner_th: `${QA_TAG} Open Quest`,
      banner_assets: {},
      tasks: [
        {
          offer: enabledBrand._id,
          offer_id: OFFER_ENABLED_ID,
          merchant_id: OFFER_ENABLED_ID,
          extra_point: 50,
          sort_order: 0,
          enabled: true,
          wording: `${QA_TAG} Shop enabled brand`,
        },
      ],
      rewards: [{ rank: 1, reward: 100, currency: 'THB' }],
    });
    await QuestModel.create({
      qa_marker: QA_TAG,
      start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'close',
      reward_status: true,
      reward_distribution_mode: 'campaign_end',
      reward_distribution_delay_days: 0,
      banner_en: `${QA_TAG} Closed Quest`,
      banner_th: `${QA_TAG} Closed Quest`,
      banner_assets: {},
      tasks: [
        {
          offer: enabledBrand._id,
          offer_id: OFFER_ENABLED_ID,
          merchant_id: OFFER_ENABLED_ID,
          extra_point: 25,
          sort_order: 0,
          enabled: true,
          wording: `${QA_TAG} Closed task`,
        },
      ],
      rewards: [{ rank: 1, reward: 50, currency: 'THB' }],
    });
    counts.quests = 2;

    // --- CATALOG / INVENTORY ---
    const published = await CatalogModel.findOneAndUpdate(
      { slug: 'qa-matrix-published' },
      {
        $set: {
          title: `${QA_TAG} Published Product`,
          slug: 'qa-matrix-published',
          brand_id: enabledBrand._id,
          default_sku: 'QA-MATRIX-SKU-001',
          price_amount: 199,
          currency: 'THB',
          inventory_quantity: 25,
          status: 'published',
          published_at: now,
          variants: [
            {
              sku: 'QA-MATRIX-SKU-001',
              title: 'Default',
              price_amount: 199,
              currency: 'THB',
              inventory_quantity: 25,
              active: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    );
    await CatalogModel.findOneAndUpdate(
      { slug: 'qa-matrix-draft' },
      {
        $set: {
          title: `${QA_TAG} Draft Product`,
          slug: 'qa-matrix-draft',
          brand_id: enabledBrand._id,
          default_sku: 'QA-MATRIX-SKU-002',
          price_amount: 99,
          currency: 'THB',
          inventory_quantity: 5,
          status: 'draft',
          variants: [
            {
              sku: 'QA-MATRIX-SKU-002',
              title: 'Draft variant',
              price_amount: 99,
              currency: 'THB',
              inventory_quantity: 5,
              active: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    );
    await CatalogModel.findOneAndUpdate(
      { slug: 'qa-matrix-zero-stock' },
      {
        $set: {
          title: `${QA_TAG} Zero Stock`,
          slug: 'qa-matrix-zero-stock',
          brand_id: enabledBrand._id,
          default_sku: 'QA-MATRIX-SKU-003',
          price_amount: 49,
          currency: 'THB',
          inventory_quantity: 0,
          status: 'published',
          published_at: now,
          variants: [
            {
              sku: 'QA-MATRIX-SKU-003',
              title: 'OOS',
              price_amount: 49,
              currency: 'THB',
              inventory_quantity: 0,
              active: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    );
    await CatalogModel.findOneAndUpdate(
      { slug: 'qa-matrix-archived' },
      {
        $set: {
          title: `${QA_TAG} Archived Product`,
          slug: 'qa-matrix-archived',
          brand_id: disabledBrand._id,
          default_sku: 'QA-MATRIX-SKU-004',
          price_amount: 29,
          currency: 'THB',
          inventory_quantity: 0,
          status: 'archived',
          variants: [
            {
              sku: 'QA-MATRIX-SKU-004',
              title: 'Archived',
              price_amount: 29,
              currency: 'THB',
              inventory_quantity: 0,
              active: false,
            },
          ],
        },
      },
      { upsert: true, new: true },
    );
    counts.catalog_products = 4;

    await CatalogBannerModel.findOneAndUpdate(
      { title: `${QA_TAG} Home Hero` },
      {
        $set: {
          title: `${QA_TAG} Home Hero`,
          image_url:
            'https://media-staging.gogocash.co/qa-matrix/catalog-hero.png',
          placement: 'home_hero',
          status: 'published',
          priority: 10,
          device: 'all',
          locale: 'all',
        },
      },
      { upsert: true, new: true },
    );
    counts.catalog_banners = 1;

    // --- ORDERS + PAYMENTS ---
    const orderStatuses: Array<{
      status: CommerceOrder['status'];
      payment_status: CommerceOrder['payment_status'];
      attempt: PaymentAttempt['status'];
    }> = [
      {
        status: 'pending_payment',
        payment_status: 'unpaid',
        attempt: 'created',
      },
      { status: 'paid', payment_status: 'paid', attempt: 'succeeded' },
      {
        status: 'processing',
        payment_status: 'paid',
        attempt: 'succeeded',
      },
      {
        status: 'fulfilled',
        payment_status: 'paid',
        attempt: 'succeeded',
      },
      {
        status: 'cancelled',
        payment_status: 'unpaid',
        attempt: 'expired',
      },
      {
        status: 'refunded',
        payment_status: 'refunded',
        attempt: 'refunded',
      },
    ];

    let orderCount = 0;
    let paymentCount = 0;
    for (const [index, row] of orderStatuses.entries()) {
      const orderNumber = `${QA_TAG}-ORD-${String(index + 1).padStart(3, '0')}`;
      const order = await OrderModel.findOneAndUpdate(
        { order_number: orderNumber },
        {
          $set: {
            order_number: orderNumber,
            user_id: options.userId,
            currency: 'THB',
            subtotal_amount: 199,
            total_amount: 199,
            status: row.status,
            payment_status: row.payment_status,
            payment_provider: 'stripe',
            items: [
              {
                product_id: published._id,
                variant_sku: 'QA-MATRIX-SKU-001',
                quantity: 1,
                unit_amount: 199,
                currency: 'THB',
                title: `${QA_TAG} Published Product`,
              },
            ],
            admin_note: `${QA_TAG} ${row.status}`,
            ...(row.status === 'paid' ||
            row.status === 'processing' ||
            row.status === 'fulfilled' ||
            row.status === 'refunded'
              ? { paid_at: now }
              : {}),
            ...(row.status === 'fulfilled' ? { fulfilled_at: now } : {}),
          },
        },
        { upsert: true, new: true },
      );
      orderCount += 1;

      await PaymentModel.findOneAndUpdate(
        {
          user_id: options.userId,
          idempotency_key: `${QA_TAG}-pay-${row.status}`,
        },
        {
          $set: {
            order_id: order._id,
            user_id: options.userId,
            provider: 'stripe',
            idempotency_key: `${QA_TAG}-pay-${row.status}`,
            amount: 199,
            currency: 'THB',
            status: row.attempt,
            provider_session_id: `cs_qa_${row.status}`,
          },
        },
        { upsert: true, new: true },
      );
      paymentCount += 1;
    }
    counts.commerce_orders = orderCount;
    counts.commerce_payment_attempts = paymentCount;

    // --- MISSING ORDERS ---
    const missionStatuses = [
      'pending',
      'under_review',
      'approved',
      'rejected',
    ] as const;
    for (const status of missionStatuses) {
      await MissionOrderModel.findOneAndUpdate(
        {
          seed_record_key: `${QA_TAG}-${options.userId}-${status}`,
        },
        {
          $set: {
            offer_id: enabledBrand._id,
            user_id: userOid,
            status,
            schema_version: 2,
            order_id: `${QA_TAG}-MO-${status}`,
            purchase_date: now,
            order_amount: 499,
            currency: 'THB',
            remarks: `${QA_TAG} missing order ${status}`,
            seed_marker: QA_TAG,
            seed_record_key: `${QA_TAG}-${options.userId}-${status}`,
            evidence_refs: [],
            notes: [],
            ...(status === 'rejected'
              ? { rejection_reason: `${QA_TAG} insufficient proof` }
              : {}),
          },
        },
        { upsert: true, new: true },
      );
    }
    counts.missionorders = missionStatuses.length;

    console.log(
      `[seed-qa-admin-matrix] done db=${mongoose.connection.db?.databaseName ?? 'unknown'}`,
      counts,
    );
    return counts;
  } finally {
    await mongoose.disconnect();
  }
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  const options = parseArgs(process.argv.slice(2));
  await seedQaAdminMatrix(mongoUri, options);
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error('[seed-qa-admin-matrix]', error.message);
    process.exit(1);
  });
}
