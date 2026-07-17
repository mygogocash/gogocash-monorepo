import 'dotenv/config';
import mongoose, { Model, Types } from 'mongoose';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import {
  TopBrandConfig,
  TopBrandConfigSchema,
} from '../src/offer/schemas/top-brand-config.schema';
import { Banner, BannerSchema } from '../src/offer/schemas/banner.schema';
import { Coupon, CouponSchema } from '../src/offer/schemas/coupon.schema';
import { Quest, QuestSchema } from '../src/point/schemas/quest.schema';
import {
  CatalogProduct,
  CatalogProductSchema,
} from '../src/catalog/schemas/catalog-product.schema';
import { FeeRate, FeeRateSchema } from '../src/withdraw/schemas/feeRate.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from '../src/withdraw/schemas/withdrawMethod.schema';
import {
  Conversion,
  ConversionSchema,
} from '../src/withdraw/schemas/conversion.schema';
import { writeLocalMediaFile } from '../src/media/local-object-storage';
import { assertLocalMongoUri } from './seed-local-admin';

export const E2E_BRAND_OFFER_ID = 900_001;
export const E2E_DISABLED_BRAND_OFFER_ID = 900_002;
export const E2E_BRAND_LOOKUP = 'e2e-brand-001';
const E2E_BANNER_OBJECT_KEY = 'e2e-banner.png';
const E2E_BANNER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export type SeedE2eFixturesResult = {
  brandId: string;
  disabledBrandId: string;
  brandOfferId: number;
  couponCode: string;
  visibleCodeCouponId: string;
  linkOnlyCouponId: string;
  linkOnlyCouponName: string;
  couponDestinationUrl: string;
  questId: string;
  catalogSku: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function seedE2eFixtures(
  mongoUri: string,
  userId: string,
  force = false,
): Promise<SeedE2eFixturesResult> {
  assertLocalMongoUri(mongoUri, force);
  await mongoose.connect(mongoUri);

  const OfferModel = (mongoose.models[Offer.name] ||
    mongoose.model(Offer.name, OfferSchema)) as Model<Offer>;
  const TopBrandModel = (mongoose.models[TopBrandConfig.name] ||
    mongoose.model(
      TopBrandConfig.name,
      TopBrandConfigSchema,
    )) as Model<TopBrandConfig>;
  const BannerModel = (mongoose.models[Banner.name] ||
    mongoose.model(Banner.name, BannerSchema)) as Model<Banner>;
  const CouponModel = (mongoose.models[Coupon.name] ||
    mongoose.model(Coupon.name, CouponSchema)) as Model<Coupon>;
  const QuestModel = (mongoose.models[Quest.name] ||
    mongoose.model(Quest.name, QuestSchema)) as Model<Quest>;
  const CatalogModel = (mongoose.models[CatalogProduct.name] ||
    mongoose.model(
      CatalogProduct.name,
      CatalogProductSchema,
    )) as Model<CatalogProduct>;
  const FeeRateModel = (mongoose.models[FeeRate.name] ||
    mongoose.model(FeeRate.name, FeeRateSchema)) as Model<FeeRate>;
  const MethodModel = (mongoose.models[WithdrawMethod.name] ||
    mongoose.model(
      WithdrawMethod.name,
      WithdrawMethodSchema,
    )) as Model<WithdrawMethod>;
  const ConversionModel = (mongoose.models[Conversion.name] ||
    mongoose.model(Conversion.name, ConversionSchema)) as Model<Conversion>;

  try {
    const enabledBrand = await OfferModel.findOneAndUpdate(
      { source: 'manual', offer_id: E2E_BRAND_OFFER_ID },
      {
        $set: {
          source: 'manual',
          offer_id: E2E_BRAND_OFFER_ID,
          merchant_id: E2E_BRAND_OFFER_ID,
          offer_name: 'E2E Test Brand',
          offer_name_display: 'E2E Test Brand',
          lookup_value: E2E_BRAND_LOOKUP,
          disabled: false,
          status: 'approved',
          countries: 'TH',
          currency: 'THB',
          commissions: [{ Commission: '5.00%' }],
          commission_store: 5,
          custom_terms: 'E2E terms — updated via automation.',
          tracking_link: 'https://example.com/e2e-track',
        },
      },
      { upsert: true, new: true },
    );

    const disabledBrand = await OfferModel.findOneAndUpdate(
      { source: 'manual', offer_id: E2E_DISABLED_BRAND_OFFER_ID },
      {
        $set: {
          source: 'manual',
          offer_id: E2E_DISABLED_BRAND_OFFER_ID,
          merchant_id: E2E_DISABLED_BRAND_OFFER_ID,
          offer_name: 'E2E Disabled Brand',
          lookup_value: 'e2e-brand-disabled',
          disabled: true,
          status: 'approved',
          countries: 'TH',
          currency: 'THB',
        },
      },
      { upsert: true, new: true },
    );

    await TopBrandModel.findOneAndUpdate(
      {},
      {
        $set: {
          brands: [
            {
              offerId: enabledBrand._id.toString(),
              cashback: '5% cashback',
            },
          ],
        },
      },
      { upsert: true, new: true },
    );

    const today = todayIsoDate();
    const e2eBannerRef = await writeLocalMediaFile(
      E2E_BANNER_OBJECT_KEY,
      E2E_BANNER_PNG,
    );
    await BannerModel.findOneAndUpdate(
      {},
      {
        $set: {
          start_date: today,
          end_date: today,
          start_date_1: today,
          end_date_1: today,
          enabled_1: true,
          link_1: '/shops',
          image_1: e2eBannerRef,
        },
      },
      { upsert: true, new: true },
    );

    const couponCode = 'E2E-COUPON-001';
    const couponDestinationUrl = 'https://example.com/e2e-track';
    const couponStartDate = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const couponEndDate = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    const visibleCodeCoupon = await CouponModel.findOneAndUpdate(
      { code: couponCode },
      {
        $set: {
          name: 'E2E #339 visible-code coupon',
          code: couponCode,
          code_enabled: true,
          offer_id: enabledBrand._id,
          start_date: couponStartDate,
          end_date: couponEndDate,
          discount: 10,
          discount_type: 'percent',
          terms_and_conditions: 'E2E #339 visible-code terms.',
          unlimited_amount_enabled: true,
          disabled: false,
        },
      },
      { upsert: true, new: true },
    );
    const linkOnlyCouponName = 'E2E #339 link-only coupon';
    const linkOnlyCoupon = await CouponModel.findOneAndUpdate(
      { name: linkOnlyCouponName, offer_id: enabledBrand._id },
      {
        $set: {
          name: linkOnlyCouponName,
          code: '',
          code_enabled: false,
          offer_id: enabledBrand._id,
          start_date: couponStartDate,
          end_date: couponEndDate,
          discount: 25,
          discount_type: 'cash',
          discount_currency: 'THB',
          eligibility: 'all users',
          max_cap: 100,
          max_cap_enabled: true,
          max_cap_currency: 'THB',
          one_time_use_enabled: false,
          usage_per_user: 3,
          quantity: 10,
          quantity_used: 0,
          unlimited_amount_enabled: false,
          terms_and_conditions: 'E2E #339 link-only terms.',
          disabled: false,
        },
      },
      { upsert: true, new: true },
    );

    const quest = await QuestModel.findOneAndUpdate(
      { status: 'open', 'tasks.offer_id': E2E_BRAND_OFFER_ID },
      {
        $set: {
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'open',
          reward_status: false,
          reward_distribution_mode: 'campaign_end',
          reward_distribution_delay_days: 0,
          banner_en: 'E2E Quest',
          banner_th: 'E2E Quest',
          tasks: [
            {
              offer: enabledBrand._id,
              offer_id: E2E_BRAND_OFFER_ID,
              merchant_id: E2E_BRAND_OFFER_ID,
              extra_point: 50,
              sort_order: 0,
              enabled: true,
              wording: 'Shop E2E brand',
            },
          ],
          rewards: [{ rank: 1, reward: 100, currency: 'THB' }],
        },
      },
      { upsert: true, new: true },
    );

    const catalogSku = 'E2E-SKU-001';
    await CatalogModel.findOneAndUpdate(
      { slug: 'e2e-catalog-product' },
      {
        $set: {
          title: 'E2E Catalog Product',
          slug: 'e2e-catalog-product',
          brand_id: enabledBrand._id,
          default_sku: catalogSku,
          price_amount: 99,
          currency: 'THB',
          inventory_quantity: 10,
          status: 'published',
          published_at: new Date(),
          variants: [
            {
              sku: catalogSku,
              title: 'E2E Variant',
              price_amount: 99,
              currency: 'THB',
              inventory_quantity: 10,
              active: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    );

    await FeeRateModel.findOneAndUpdate(
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
        },
      },
      { upsert: true, new: true },
    );

    await MethodModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), account_no: '1234567890' },
      {
        $set: {
          user_id: new Types.ObjectId(userId),
          account_name: 'E2E Customer',
          bank_name: 'Kasikorn Bank',
          account_no: '1234567890',
          bank_code: '004',
          is_default: true,
        },
      },
      { upsert: true, new: true },
    );

    await ConversionModel.deleteMany({
      aff_sub1: `user_id:${userId}`,
    });
    await ConversionModel.create({
      conversion_id: Date.now(),
      offer_id: E2E_BRAND_OFFER_ID,
      offer_name: 'E2E Test Brand',
      merchant_id: E2E_BRAND_OFFER_ID,
      aff_sub1: `user_id:${userId}`,
      user_id: new Types.ObjectId(userId),
      conversion_status: 'approved',
      currency: 'THB',
      payout: 200,
      sale_amount: 2000,
      datetime_conversion: new Date(),
    });

    console.log('[seed-e2e-fixtures] fixtures upserted');

    return {
      brandId: enabledBrand._id.toString(),
      disabledBrandId: disabledBrand._id.toString(),
      brandOfferId: E2E_BRAND_OFFER_ID,
      couponCode,
      visibleCodeCouponId: visibleCodeCoupon._id.toString(),
      linkOnlyCouponId: linkOnlyCoupon._id.toString(),
      linkOnlyCouponName,
      couponDestinationUrl,
      questId: quest._id.toString(),
      catalogSku,
    };
  } finally {
    await mongoose.disconnect();
  }
}

export { todayIsoDate };
