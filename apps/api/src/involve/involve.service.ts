import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';

import {
  CreateAffiliateAiDto,
  CreateAffiliateDto,
  RequestGetConversion,
} from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Offer } from '../offer/schemas/offer.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import type { Collection } from 'mongoose';
import { Deeplink } from './schemas/deeplink.schema';
import { User } from 'src/user/schemas/user.schema';
import { ResponseGenerateDeeplink } from './dto/deeplink.dto';
import { convertToTHB, convertToUSD } from 'src/utils/helper';
import { Category } from 'src/offer/schemas/category.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { buildUserConversionScopeFilter } from 'src/withdraw/conversion-user-id.util';
import {
  AFFILIATE_MINT_RESERVATION_COLLECTION,
  AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
  AFFILIATE_MINT_RESERVATION_RETENTION_MS,
  AFFILIATE_MINT_RESERVATION_TTL_INDEX,
  AffiliateMintReservation,
} from './schemas/affiliate-mint-reservation.schema';
import { CategoryIntegrityService } from 'src/policy/category-integrity.service';
import { PolicyMediaAssetRegistryService } from 'src/policy/policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from 'src/policy/policy-media-cleanup.service';
import type { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';

export { AFFILIATE_MINT_RESERVATION_COLLECTION } from './schemas/affiliate-mint-reservation.schema';

/** Stable error code: Involve /authenticate rejected our credentials. */
const GOGOSENSE_UPSTREAM_AUTH_FAILED = 'GOGOSENSE_UPSTREAM_AUTH_FAILED';
const AFFILIATE_SOURCE = 'involve';
const DESTINATION_IDENTITY_INDEX = 'affiliate_destination_identity_unique_v1';
const GENERAL_DESTINATION_SENTINEL =
  'gogocash:affiliate:general-destination:v1';
// One mint can include authentication, a 401 refresh, and one retried provider
// request. Keep the lease longer than that bounded sequence so a successful
// owner still has time to durably fence the provider result.
const MINT_LEASE_MS = 60_000;
const PROVIDER_TIMEOUT_MS = 10_000;
const RESERVATION_POLL_MS = 25;
const RESERVATION_WAIT_MS = PROVIDER_TIMEOUT_MS + 5_000;
const PROVIDER_RESULT_PERSIST_ATTEMPTS = 3;
const INVOLVE_LOGO_FIELDS = [
  'logo',
  'logo_desktop',
  'logo_mobile',
  'logo_circle',
] as const;
const INVOLVE_BANNER_FIELDS = ['banner', 'banner_mobile'] as const;

type DestinationIdentity = {
  source: typeof AFFILIATE_SOURCE;
  user_id: Types.ObjectId;
  offer_id: number;
  merchant_id: number;
  destination_hash: string;
  destination_url: string;
};

type DeeplinkCacheRow = {
  _id?: unknown;
  source?: string;
  deeplink?: string;
  destination_hash?: string;
  destination_url?: string;
};

function commandOwnedProviderDisplacement(
  value: unknown,
): CommandOwnedStoredMediaAsset | undefined {
  if (value == null) return undefined;
  if (
    typeof value !== 'object' ||
    (value as { provider?: unknown }).provider !== 'r2' ||
    (value as { ownership?: unknown }).ownership !== 'command-owned' ||
    typeof (value as { owner_key?: unknown }).owner_key !== 'string' ||
    typeof (value as { owner_attempt_token?: unknown }).owner_attempt_token !==
      'string' ||
    typeof (value as { url?: unknown }).url !== 'string' ||
    typeof (value as { bucket?: unknown }).bucket !== 'string' ||
    typeof (value as { object_key?: unknown }).object_key !== 'string' ||
    typeof (value as { sha256?: unknown }).sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test((value as { sha256: string }).sha256) ||
    typeof (value as { original_name?: unknown }).original_name !== 'string'
  ) {
    throw new ServiceUnavailableException(
      'Involve media sync found invalid tracked media proof; overwrite was refused',
    );
  }
  return value as CommandOwnedStoredMediaAsset;
}

function providerGroupReplacesAsset(
  provider: Record<string, unknown>,
  fields: readonly string[],
  asset: CommandOwnedStoredMediaAsset,
) {
  const touched = fields.some((field) =>
    Object.prototype.hasOwnProperty.call(provider, field),
  );
  if (!touched) return false;
  const supplied = fields
    .map((field) => provider[field])
    .filter(
      (value): value is string =>
        typeof value === 'string' && Boolean(value.trim()),
    )
    .map((value) => value.trim());
  return supplied.length === 0 || supplied.some((url) => url !== asset.url);
}

function canonicalCredentialFreeHttpUrl(
  value: unknown,
  allowEmpty: boolean,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return allowEmpty ? '' : null;
  try {
    const url = new URL(trimmed);
    const safeProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    if (!safeProtocol || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalRequestedDestination(value: unknown): string {
  const canonical = canonicalCredentialFreeHttpUrl(value, true);
  if (canonical === null) {
    throw new BadRequestException(
      'deeplink must be empty or a credential-free HTTP(S) URL',
    );
  }
  return canonical;
}

function canonicalTrackedDestination(value: unknown): string {
  const canonical = canonicalCredentialFreeHttpUrl(value, false);
  if (canonical === null) {
    throw new BadGatewayException(
      'Affiliate provider returned an invalid tracking URL',
    );
  }
  return canonical;
}

function destinationHash(destination: string): string {
  return createHash('sha256').update(destination, 'utf8').digest('hex');
}

function destinationIdentityHash(destination: string): string {
  return destinationHash(
    destination ? destination : GENERAL_DESTINATION_SENTINEL,
  );
}

function reservationId(identity: DestinationIdentity): string {
  return destinationHash(
    [
      identity.source,
      identity.user_id.toHexString(),
      identity.offer_id,
      identity.merchant_id,
      identity.destination_hash,
    ].join(':'),
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

@Injectable()
export class InvolveService {
  private readonly logger = new Logger(InvolveService.name);
  private endpoint: string;
  private destinationIdentityIndexReady = false;
  private destinationIdentityIndexPromise: Promise<boolean> | null = null;
  private reservationRetentionIndexPromise: Promise<boolean> | null = null;
  private readonly inFlightAffiliateMints = new Map<
    string,
    Promise<DeeplinkCacheRow>
  >();
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    private readonly categoryIntegrity: CategoryIntegrityService,
    private readonly policyMediaRegistry: PolicyMediaAssetRegistryService,
    private readonly policyMediaCleanup: PolicyMediaCleanupService,
  ) {
    this.endpoint = `https://api.involve.asia/api`;
  }

  onApplicationBootstrap(): void {
    // Best effort only: a legacy duplicate or transient Mongo failure must not
    // take down unrelated API routes. Exact-destination minting separately
    // requires this index and fails closed before contacting the provider.
    void this.ensureDestinationIdentityIndex();
    // Retention is deliberately best-effort: a missing TTL index retains safe
    // records longer, while mint correctness remains enforced by reservations.
    void this.ensureMintReservationRetentionIndex();
  }

  async ensureMintReservationRetentionIndex(): Promise<boolean> {
    if (this.reservationRetentionIndexPromise) {
      return this.reservationRetentionIndexPromise;
    }
    this.reservationRetentionIndexPromise = (async () => {
      try {
        const collection = this.mintReservationCollection();
        await collection.createIndex(
          { expires_at: 1 },
          {
            name: AFFILIATE_MINT_RESERVATION_TTL_INDEX,
            expireAfterSeconds: 0,
            partialFilterExpression: {
              status: {
                $in: ['reserved', 'committed', 'pre_mint_failed'],
              },
            },
          },
        );
        // The v1 index used the same key with a narrower partial filter. Create
        // and confirm v2 first, then remove v1; reversing the order would open a
        // retention gap if createIndex failed on a replica during deployment.
        await collection
          .dropIndex(AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX)
          .catch((error: unknown) => {
            const codeName =
              typeof error === 'object' && error !== null && 'codeName' in error
                ? (error as { codeName?: unknown }).codeName
                : undefined;
            if (codeName !== 'IndexNotFound') {
              this.logger.warn(
                'Affiliate mint reservation legacy retention index could not be removed; v2 remains active.',
              );
            }
          });
        return true;
      } catch {
        console.warn(
          'Affiliate mint reservation retention index is unavailable; records will be retained safely.',
        );
        return false;
      } finally {
        this.reservationRetentionIndexPromise = null;
      }
    })();
    return this.reservationRetentionIndexPromise;
  }

  async ensureDestinationIdentityIndex(): Promise<boolean> {
    if (this.destinationIdentityIndexPromise) {
      return this.destinationIdentityIndexPromise;
    }

    // Readiness is a per-new-mint safety gate, not a boot-time assumption. An
    // operator can drop or replace an index while a replica remains alive.
    if (this.destinationIdentityIndexReady) {
      if (await this.hasDestinationIdentityIndex()) return true;
      this.destinationIdentityIndexReady = false;
    }

    this.destinationIdentityIndexPromise = (async () => {
      try {
        const duplicates = await this.deeplinkModel.aggregate([
          {
            $match: {
              destination_hash: { $type: 'string' },
              source: { $type: 'string' },
            },
          },
          {
            $group: {
              _id: {
                source: '$source',
                user_id: '$user_id',
                offer_id: '$offer_id',
                merchant_id: '$merchant_id',
                destination_hash: '$destination_hash',
              },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
          { $limit: 1 },
        ]);
        if (duplicates.length > 0) {
          console.warn(
            'Affiliate destination index preflight found duplicate hashed identities; exact-target minting remains disabled.',
          );
          return false;
        }

        await this.deeplinkModel.collection.createIndex(
          {
            source: 1,
            user_id: 1,
            offer_id: 1,
            merchant_id: 1,
            destination_hash: 1,
          },
          {
            name: DESTINATION_IDENTITY_INDEX,
            unique: true,
            partialFilterExpression: {
              destination_hash: { $type: 'string' },
              source: { $type: 'string' },
            },
          },
        );
        this.destinationIdentityIndexReady = true;
        return true;
      } catch {
        // Another replica can win the same createIndex race. Verify the exact
        // index by name/options before declaring it unavailable; never treat a
        // generic create error itself as proof of readiness.
        if (await this.waitForDestinationIdentityIndex()) {
          this.destinationIdentityIndexReady = true;
          return true;
        }
        console.warn(
          'Affiliate destination index is unavailable; exact-target minting remains disabled.',
        );
        return false;
      } finally {
        this.destinationIdentityIndexPromise = null;
      }
    })();

    return this.destinationIdentityIndexPromise;
  }

  private async waitForDestinationIdentityIndex(): Promise<boolean> {
    for (let attempt = 0; attempt < 20; attempt++) {
      if (await this.hasDestinationIdentityIndex()) return true;
      if (attempt < 19) {
        await new Promise((resolve) =>
          setTimeout(resolve, RESERVATION_POLL_MS),
        );
      }
    }
    return false;
  }

  private async hasDestinationIdentityIndex(): Promise<boolean> {
    try {
      const indexes = await this.deeplinkModel.collection.indexes();
      const index = indexes.find(
        (candidate) => candidate.name === DESTINATION_IDENTITY_INDEX,
      );
      const expectedKeyEntries = [
        ['source', 1],
        ['user_id', 1],
        ['offer_id', 1],
        ['merchant_id', 1],
        ['destination_hash', 1],
      ];
      const actualKeyEntries = Object.entries(index?.key ?? {});
      const exactKey =
        actualKeyEntries.length === expectedKeyEntries.length &&
        actualKeyEntries.every(
          ([field, direction], position) =>
            field === expectedKeyEntries[position][0] &&
            direction === expectedKeyEntries[position][1],
        );
      const partial = index?.partialFilterExpression;
      // No partial filter is stricter and therefore safe. If one exists, it
      // must be our exact source/hash string predicate; an extra predicate can
      // silently exclude a new cache row from uniqueness protection.
      const safePartial =
        partial === undefined ||
        (Object.keys(partial).length === 2 &&
          partial.source?.$type === 'string' &&
          partial.destination_hash?.$type === 'string');
      return Boolean(index?.unique === true && exactKey && safePartial);
    } catch {
      return false;
    }
  }
  async signIn() {
    let res: { data: { data: { token: string } } };
    try {
      res = await axios.post(
        `${this.endpoint}/authenticate`,
        {
          secret: process.env.INVOLVE_SECRET,
          key: 'general',
        },
        { timeout: PROVIDER_TIMEOUT_MS },
      );
    } catch (error) {
      // Staging incident 2026-07-10: a rejected INVOLVE_SECRET rethrew the raw
      // axios error (which embeds the request body — i.e. the secret) and Nest
      // rendered a bare 500 from /gototrack/activate. Map to a 502 with a
      // stable code, built as a FRESH object so the secret can never leak.
      const response = (
        error as {
          response?: { status?: number; data?: { status_code?: number } };
        }
      ).response;
      throw new HttpException(
        {
          message:
            "We couldn't complete your request right now. Please try again in a moment or contact support if it keeps happening.",
          code: GOGOSENSE_UPSTREAM_AUTH_FAILED,
          upstreamStatusCode: response?.data?.status_code ?? response?.status,
        },
        502,
      );
    }

    const token = res?.data?.data?.token;
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new HttpException(
        {
          message:
            "We couldn't complete your request right now. Please try again in a moment or contact support if it keeps happening.",
          code: GOGOSENSE_UPSTREAM_AUTH_FAILED,
        },
        502,
      );
    }

    await this.cacheManager.set('access_token_involve', token);

    return res.data;
  }

  private async prepareInvolveAccessToken(): Promise<string> {
    const cached = await this.cacheManager.get('access_token_involve');
    if (typeof cached === 'string' && cached.trim().length > 0) {
      return cached;
    }
    const authenticated = await this.signIn();
    const token = authenticated?.data?.token;
    if (typeof token !== 'string' || token.trim().length === 0) {
      // signIn validates this too; retain a fail-closed boundary if its return
      // contract is changed independently in the future.
      throw new HttpException(
        {
          message:
            "We couldn't complete your request right now. Please try again in a moment or contact support if it keeps happening.",
          code: GOGOSENSE_UPSTREAM_AUTH_FAILED,
        },
        502,
      );
    }
    return token;
  }

  async signInOld() {
    const res = await axios.post(
      `${this.endpoint}/authenticate`,
      {
        secret: process.env.INVOLVE_SECRET_OLD,
        key: 'general',
      },
      { timeout: PROVIDER_TIMEOUT_MS },
    );

    await this.cacheManager.set(
      'access_token_involve_old',
      res.data.data.token,
    );

    return res.data;
  }
  createDeeplinkMongo(
    createInvolveDto: CreateAffiliateDto & {
      user_id: string;
      destination_url?: string;
    },
  ) {
    if (!isValidObjectId(createInvolveDto.user_id)) {
      throw new BadRequestException(
        'Invalid user_id: expected a 24-character hexadecimal ObjectId',
      );
    }
    const trackedDeeplink = canonicalTrackedDestination(
      createInvolveDto.deeplink,
    );
    const destinationUrl = canonicalRequestedDestination(
      createInvolveDto.destination_url ?? '',
    );
    const createLink = this.deeplinkModel.create({
      offer_id: Number(createInvolveDto.offer_id),
      merchant_id: Number(createInvolveDto.merchant_id),
      user_id: new Types.ObjectId(createInvolveDto.user_id),
      deeplink: trackedDeeplink,
      source: AFFILIATE_SOURCE,
      destination_url: destinationUrl,
      destination_hash: destinationIdentityHash(destinationUrl),
      click_date: [new Date()],
    });
    return createLink;
  }

  async createAffiliate(createInvolveDto: CreateAffiliateDto, id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        'Invalid user_id: expected a 24-character hexadecimal ObjectId',
      );
    }
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.createAffiliateForUser(createInvolveDto, user._id.toString());
  }

  async createAffiliateAi(
    createInvolveDto: CreateAffiliateAiDto,
    email: string,
  ) {
    const user = await this.userModel.findOne({ email: email });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.createAffiliateForUser(
      {
        offer_id: createInvolveDto.offer_id,
        merchant_id: createInvolveDto.merchant_id,
        deeplink: '',
      },
      user._id.toString(),
    );
  }

  private destinationIdentity(
    createInvolveDto: CreateAffiliateDto,
    userId: string,
  ): DestinationIdentity {
    const destinationUrl = canonicalRequestedDestination(
      createInvolveDto.deeplink,
    );
    return {
      source: AFFILIATE_SOURCE,
      user_id: new Types.ObjectId(userId),
      offer_id: Number(createInvolveDto.offer_id),
      merchant_id: Number(createInvolveDto.merchant_id),
      destination_hash: destinationIdentityHash(destinationUrl),
      destination_url: destinationUrl,
    };
  }

  private destinationHashFilter(identity: DestinationIdentity) {
    return {
      source: identity.source,
      user_id: identity.user_id,
      offer_id: identity.offer_id,
      merchant_id: identity.merchant_id,
      destination_hash: identity.destination_hash,
    };
  }

  private assertCachedDestinationMatches(
    cached: DeeplinkCacheRow,
    identity: DestinationIdentity,
  ): void {
    if (
      cached.source !== identity.source ||
      cached.destination_url !== identity.destination_url
    ) {
      throw new ServiceUnavailableException(
        'Affiliate destination cache identity collision',
      );
    }
    canonicalTrackedDestination(cached.deeplink);
  }

  private async findExactDestination(
    identity: DestinationIdentity,
  ): Promise<DeeplinkCacheRow | null> {
    const cached = (await this.deeplinkModel.findOne(
      this.destinationHashFilter(identity),
    )) as unknown as DeeplinkCacheRow | null;
    if (!cached) return null;
    this.assertCachedDestinationMatches(cached, identity);
    return cached;
  }

  private async touchExactDestination(
    identity: DestinationIdentity,
    cached: DeeplinkCacheRow,
    set?: Record<string, unknown>,
  ): Promise<DeeplinkCacheRow> {
    const update = {
      ...(set ? { $set: set } : {}),
      $push: { click_date: new Date() },
    };
    const updated = (await this.deeplinkModel.findOneAndUpdate(
      this.destinationHashFilter(identity),
      update,
      { new: true },
    )) as unknown as DeeplinkCacheRow | null;
    return updated ?? cached;
  }

  private async findLegacyGeneralDestination(
    identity: DestinationIdentity,
  ): Promise<DeeplinkCacheRow | null> {
    const legacy = (await this.deeplinkModel.findOne({
      user_id: identity.user_id,
      offer_id: identity.offer_id,
      merchant_id: identity.merchant_id,
      destination_hash: { $exists: false },
      $and: [
        {
          $or: [{ source: AFFILIATE_SOURCE }, { source: { $exists: false } }],
        },
        {
          $or: [
            { destination_url: '' },
            { destination_url: { $exists: false } },
          ],
        },
      ],
    })) as unknown as DeeplinkCacheRow | null;
    if (!legacy) return null;
    canonicalTrackedDestination(legacy.deeplink);
    return legacy;
  }

  private mintReservationCollection(): Collection<AffiliateMintReservation> {
    return this.deeplinkModel.db.collection<AffiliateMintReservation>(
      AFFILIATE_MINT_RESERVATION_COLLECTION,
    );
  }

  private assertReservationMatches(
    reservation: AffiliateMintReservation,
    identity: DestinationIdentity,
  ): void {
    if (
      reservation.source !== identity.source ||
      !reservation.user_id.equals(identity.user_id) ||
      reservation.offer_id !== identity.offer_id ||
      reservation.merchant_id !== identity.merchant_id ||
      reservation.destination_hash !== identity.destination_hash ||
      reservation.destination_url !== identity.destination_url
    ) {
      throw new ServiceUnavailableException(
        'Affiliate mint reservation identity collision',
      );
    }
  }

  private newReservation(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
    now = new Date(),
  ): AffiliateMintReservation {
    return {
      _id: reservationId(identity),
      source: identity.source,
      user_id: identity.user_id,
      offer_id: identity.offer_id,
      merchant_id: identity.merchant_id,
      destination_hash: identity.destination_hash,
      destination_url: identity.destination_url,
      status: 'reserved',
      owner_token: ownerToken,
      attempt_token: attemptToken,
      lease_expires_at: new Date(now.getTime() + MINT_LEASE_MS),
      expires_at: new Date(
        now.getTime() + AFFILIATE_MINT_RESERVATION_RETENTION_MS,
      ),
      created_at: now,
      updated_at: now,
    };
  }

  private async acquireMintReservation(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
  ): Promise<AffiliateMintReservation> {
    const collection = this.mintReservationCollection();
    const candidate = this.newReservation(identity, ownerToken, attemptToken);
    try {
      await collection.insertOne(candidate);
      return candidate;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw new ServiceUnavailableException(
          'Affiliate mint reservation is temporarily unavailable',
        );
      }
      const existing = await collection.findOne({ _id: candidate._id });
      if (!existing) {
        throw new ServiceUnavailableException(
          'Affiliate mint reservation conflict',
        );
      }
      this.assertReservationMatches(existing, identity);
      return existing;
    }
  }

  private async reclaimExpiredUnstartedReservation(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
  ): Promise<AffiliateMintReservation | null> {
    const now = new Date();
    const reclaimed = await this.mintReservationCollection().findOneAndUpdate(
      {
        _id: reservationId(identity),
        status: 'reserved',
        lease_expires_at: { $lte: now },
        provider_started_at: { $exists: false },
      },
      {
        $set: {
          owner_token: ownerToken,
          attempt_token: attemptToken,
          lease_expires_at: new Date(now.getTime() + MINT_LEASE_MS),
          expires_at: new Date(
            now.getTime() + AFFILIATE_MINT_RESERVATION_RETENTION_MS,
          ),
          updated_at: now,
        },
      },
      { returnDocument: 'after' },
    );
    if (reclaimed) this.assertReservationMatches(reclaimed, identity);
    return reclaimed;
  }

  private async reclaimPreMintFailedReservation(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
  ): Promise<AffiliateMintReservation | null> {
    const now = new Date();
    const reclaimed = await this.mintReservationCollection().findOneAndUpdate(
      {
        _id: reservationId(identity),
        status: 'pre_mint_failed',
        provider_started_at: { $exists: false },
      },
      {
        $set: {
          status: 'reserved',
          owner_token: ownerToken,
          attempt_token: attemptToken,
          lease_expires_at: new Date(now.getTime() + MINT_LEASE_MS),
          expires_at: new Date(
            now.getTime() + AFFILIATE_MINT_RESERVATION_RETENTION_MS,
          ),
          updated_at: now,
        },
        $unset: {
          pre_mint_failed_at: '',
          failure_code: '',
        },
      },
      { returnDocument: 'after' },
    );
    if (reclaimed) this.assertReservationMatches(reclaimed, identity);
    return reclaimed;
  }

  private async markPreMintFailed(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.mintReservationCollection().updateOne(
      {
        _id: reservationId(identity),
        status: 'reserved',
        owner_token: ownerToken,
        attempt_token: attemptToken,
        provider_started_at: { $exists: false },
      },
      {
        $set: {
          status: 'pre_mint_failed',
          pre_mint_failed_at: now,
          failure_code: 'upstream_auth_failed',
          expires_at: new Date(
            now.getTime() + AFFILIATE_MINT_RESERVATION_RETENTION_MS,
          ),
          updated_at: now,
        },
      },
    );
    return result.matchedCount === 1;
  }

  private async markProviderStarted(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.mintReservationCollection().updateOne(
      {
        _id: reservationId(identity),
        status: 'reserved',
        owner_token: ownerToken,
        attempt_token: attemptToken,
        lease_expires_at: { $gt: now },
        provider_started_at: { $exists: false },
      },
      {
        $set: {
          status: 'provider_started',
          provider_started_at: now,
          lease_expires_at: new Date(now.getTime() + MINT_LEASE_MS),
          updated_at: now,
        },
        $unset: { expires_at: '' },
      },
    );
    return result.matchedCount === 1;
  }

  private async persistProviderResult(
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
    trackedDeeplink: string,
  ): Promise<AffiliateMintReservation> {
    for (
      let attempt = 0;
      attempt < PROVIDER_RESULT_PERSIST_ATTEMPTS;
      attempt++
    ) {
      const now = new Date();
      try {
        const result = await this.mintReservationCollection().findOneAndUpdate(
          {
            _id: reservationId(identity),
            status: 'provider_started',
            owner_token: ownerToken,
            attempt_token: attemptToken,
            lease_expires_at: { $gt: now },
          },
          {
            $set: {
              status: 'provider_succeeded',
              tracked_deeplink: trackedDeeplink,
              provider_succeeded_at: now,
              updated_at: now,
            },
            $unset: { expires_at: '' },
          },
          { returnDocument: 'after' },
        );
        if (result) {
          this.assertReservationMatches(result, identity);
          return result;
        }
        break;
      } catch {
        // Retry only the durable result write. Never repeat the provider call.
      }
    }
    throw new ServiceUnavailableException(
      'Affiliate provider result could not be durably fenced; retry is unsafe',
    );
  }

  private async finalizePersistedProviderResult(
    createInvolveDto: CreateAffiliateDto,
    userId: string,
    identity: DestinationIdentity,
    reservation: AffiliateMintReservation,
    fence?: { ownerToken: string; attemptToken: string },
  ): Promise<DeeplinkCacheRow> {
    this.assertReservationMatches(reservation, identity);
    if (
      (reservation.status !== 'provider_succeeded' &&
        reservation.status !== 'committed') ||
      !reservation.tracked_deeplink
    ) {
      throw new ServiceUnavailableException(
        'Affiliate provider result is not available for completion',
      );
    }
    const trackedDeeplink = canonicalTrackedDestination(
      reservation.tracked_deeplink,
    );
    const durableReservation = await this.mintReservationCollection().findOne({
      _id: reservationId(identity),
      status: { $in: ['provider_succeeded', 'committed'] },
      tracked_deeplink: trackedDeeplink,
      ...(fence
        ? {
            owner_token: fence.ownerToken,
            attempt_token: fence.attemptToken,
          }
        : {}),
    });
    if (!durableReservation) {
      throw new ServiceUnavailableException(
        'Affiliate provider result completion fence was lost',
      );
    }
    this.assertReservationMatches(durableReservation, identity);
    const existing = await this.findExactDestination(identity);
    if (existing) {
      await this.markReservationCommitted(identity, trackedDeeplink);
      return this.touchExactDestination(identity, existing);
    }
    let cacheRow: DeeplinkCacheRow;
    try {
      cacheRow = (await this.createDeeplinkMongo({
        ...createInvolveDto,
        offer_id: identity.offer_id,
        merchant_id: identity.merchant_id,
        user_id: userId,
        deeplink: trackedDeeplink,
        destination_url: identity.destination_url,
      })) as unknown as DeeplinkCacheRow;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw new ServiceUnavailableException(
          'Affiliate cache completion is temporarily unavailable',
        );
      }
      const winner = await this.findExactDestination(identity);
      if (!winner) {
        throw new ServiceUnavailableException(
          'Affiliate destination cache concurrency conflict',
        );
      }
      cacheRow = winner;
    }

    await this.markReservationCommitted(identity, trackedDeeplink);
    return cacheRow;
  }

  private async markReservationCommitted(
    identity: DestinationIdentity,
    trackedDeeplink: string,
  ): Promise<void> {
    await this.mintReservationCollection()
      .updateOne(
        {
          _id: reservationId(identity),
          status: { $in: ['provider_succeeded', 'committed'] },
          tracked_deeplink: trackedDeeplink,
        },
        {
          $set: {
            status: 'committed',
            committed_at: new Date(),
            updated_at: new Date(),
            expires_at: new Date(
              Date.now() + AFFILIATE_MINT_RESERVATION_RETENTION_MS,
            ),
          },
        },
      )
      .catch(() => undefined);
  }

  private async reconcileProviderSucceededReservationFromCache(
    identity: DestinationIdentity,
    cached: DeeplinkCacheRow,
  ): Promise<void> {
    try {
      const trackedDeeplink = canonicalTrackedDestination(cached.deeplink);
      const now = new Date();
      await this.mintReservationCollection().updateOne(
        {
          _id: reservationId(identity),
          status: 'provider_succeeded',
          source: identity.source,
          user_id: identity.user_id,
          offer_id: identity.offer_id,
          merchant_id: identity.merchant_id,
          destination_hash: identity.destination_hash,
          destination_url: identity.destination_url,
          tracked_deeplink: trackedDeeplink,
        },
        {
          $set: {
            status: 'committed',
            committed_at: now,
            updated_at: now,
            expires_at: new Date(
              now.getTime() + AFFILIATE_MINT_RESERVATION_RETENTION_MS,
            ),
          },
        },
      );
    } catch {
      // A valid durable cache row remains authoritative. Retry this bounded,
      // exact reconciliation on the next hit without exposing identity data.
      this.logger.warn(
        'Affiliate reservation cache reconciliation failed; it will retry on the next cache hit.',
      );
    }
  }

  private async runOwnedMintAttempt(
    createInvolveDto: CreateAffiliateDto,
    userId: string,
    identity: DestinationIdentity,
    ownerToken: string,
    attemptToken: string,
  ): Promise<DeeplinkCacheRow> {
    const providerInput = {
      offer_id: identity.offer_id,
      merchant_id: identity.merchant_id,
      deeplink: canonicalRequestedDestination(identity.destination_url),
      user_id: userId,
    };
    let token: string;
    try {
      // Authentication is definitively pre-provider. A failure here is safe to
      // mark and reclaim because no /deeplink/generate request has started.
      token = await this.prepareInvolveAccessToken();
    } catch (error) {
      await this.markPreMintFailed(identity, ownerToken, attemptToken).catch(
        () => false,
      );
      throw error;
    }

    if (!(await this.markProviderStarted(identity, ownerToken, attemptToken))) {
      throw new ServiceUnavailableException(
        'Affiliate mint lease was lost before provider start',
      );
    }

    // From this point on the provider may have acted. Every failure leaves the
    // durable provider_started record in place, which is intentionally not
    // reclaimable: blindly retrying could mint a second external link.
    const deep = await this.createDeeplinkInvolveWithToken(
      providerInput,
      token,
    );
    const trackedDeeplink = canonicalTrackedDestination(
      deep.data.tracking_link,
    );
    const persisted = await this.persistProviderResult(
      identity,
      ownerToken,
      attemptToken,
      trackedDeeplink,
    );
    return this.finalizePersistedProviderResult(
      createInvolveDto,
      userId,
      identity,
      persisted,
      { ownerToken, attemptToken },
    );
  }

  private async mintWithDistributedReservation(
    createInvolveDto: CreateAffiliateDto,
    userId: string,
    identity: DestinationIdentity,
  ): Promise<DeeplinkCacheRow> {
    const ownerToken = randomUUID();
    const attemptToken = randomUUID();
    let reservation = await this.acquireMintReservation(
      identity,
      ownerToken,
      attemptToken,
    );
    const deadline = Date.now() + RESERVATION_WAIT_MS;

    while (true) {
      this.assertReservationMatches(reservation, identity);
      if (
        reservation.status === 'provider_succeeded' ||
        reservation.status === 'committed'
      ) {
        return this.finalizePersistedProviderResult(
          createInvolveDto,
          userId,
          identity,
          reservation,
        );
      }

      const ownsReservation =
        reservation.owner_token === ownerToken &&
        reservation.attempt_token === attemptToken;
      if (reservation.status === 'reserved' && ownsReservation) {
        return this.runOwnedMintAttempt(
          createInvolveDto,
          userId,
          identity,
          ownerToken,
          attemptToken,
        );
      }

      if (reservation.status === 'pre_mint_failed') {
        const reclaimed = await this.reclaimPreMintFailedReservation(
          identity,
          ownerToken,
          attemptToken,
        );
        if (reclaimed) {
          reservation = reclaimed;
          continue;
        }
      }

      const leaseExpired = reservation.lease_expires_at.getTime() <= Date.now();
      if (reservation.status === 'reserved' && leaseExpired) {
        const reclaimed = await this.reclaimExpiredUnstartedReservation(
          identity,
          ownerToken,
          attemptToken,
        );
        if (reclaimed) {
          reservation = reclaimed;
          continue;
        }
      }

      if (reservation.status === 'provider_started' && leaseExpired) {
        throw new ServiceUnavailableException(
          'Affiliate provider attempt is uncertain; automatic remint is disabled',
        );
      }
      if (Date.now() >= deadline) {
        throw new ServiceUnavailableException(
          'Affiliate mint is still pending; retry later',
        );
      }

      await new Promise((resolve) => setTimeout(resolve, RESERVATION_POLL_MS));
      const refreshed = await this.mintReservationCollection().findOne({
        _id: reservationId(identity),
      });
      if (!refreshed) {
        throw new ServiceUnavailableException(
          'Affiliate mint reservation disappeared',
        );
      }
      reservation = refreshed;
    }
  }

  private async createAffiliateForUser(
    createInvolveDto: CreateAffiliateDto,
    userId: string,
  ): Promise<DeeplinkCacheRow> {
    const identity = this.destinationIdentity(createInvolveDto, userId);
    const cached = await this.findExactDestination(identity);
    if (cached) {
      // A matching row is only a unique durable authority while the exact
      // identity index exists. If an operator drops it, return the historical
      // cache response but never expire a reservation based on an ambiguous
      // `findOne` result; the guarded reconciliation command will also refuse.
      if (!(await this.hasDestinationIdentityIndex())) {
        this.logger.warn(
          'Affiliate reservation cache reconciliation skipped because the exact destination index is unavailable.',
        );
        return cached;
      }
      await this.reconcileProviderSucceededReservationFromCache(
        identity,
        cached,
      );
      return this.touchExactDestination(identity, cached);
    }

    if (!identity.destination_url) {
      const legacy = await this.findLegacyGeneralDestination(identity);
      if (legacy) {
        // Hashless legacy general rows predate reservation identity. Reuse them
        // read-only; mutating one into the sentinel identity can race another
        // replica and is not necessary to preserve existing tracked links.
        return legacy;
      }
    }
    if (!(await this.ensureDestinationIdentityIndex())) {
      throw new ServiceUnavailableException(
        'Affiliate destination cache is temporarily unavailable',
      );
    }

    const inFlightKey = [
      identity.source,
      identity.user_id.toHexString(),
      identity.offer_id,
      identity.merchant_id,
      identity.destination_hash,
    ].join(':');
    const activeMint = this.inFlightAffiliateMints.get(inFlightKey);
    if (activeMint) {
      const winner = await activeMint;
      const persisted = await this.findExactDestination(identity);
      return persisted
        ? this.touchExactDestination(identity, persisted)
        : winner;
    }

    const mint = this.mintWithDistributedReservation(
      createInvolveDto,
      userId,
      identity,
    );
    this.inFlightAffiliateMints.set(inFlightKey, mint);
    try {
      return await mint;
    } finally {
      if (this.inFlightAffiliateMints.get(inFlightKey) === mint) {
        this.inFlightAffiliateMints.delete(inFlightKey);
      }
    }
  }

  async createDeeplinkInvolve(
    createInvolveDto: CreateAffiliateDto & { user_id: string },
    authRetriesRemaining = 1,
  ): Promise<ResponseGenerateDeeplink> {
    const token = await this.prepareInvolveAccessToken();
    return this.createDeeplinkInvolveWithToken(
      createInvolveDto,
      token,
      authRetriesRemaining,
    );
  }

  private async createDeeplinkInvolveWithToken(
    createInvolveDto: CreateAffiliateDto & { user_id: string },
    token: string,
    authRetriesRemaining = 1,
  ): Promise<ResponseGenerateDeeplink> {
    const canonicalDestination = canonicalRequestedDestination(
      createInvolveDto.deeplink,
    );
    try {
      const res = await axios.post(
        `${this.endpoint}/deeplink/generate`,
        {
          offer_id: createInvolveDto.offer_id,
          merchant_id: createInvolveDto.merchant_id,
          aff_sub: `user_id:${createInvolveDto.user_id}`,
          deeplink: canonicalDestination,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: PROVIDER_TIMEOUT_MS,
        },
      );
      const response = res.data as ResponseGenerateDeeplink;
      return {
        ...response,
        data: {
          ...response.data,
          tracking_link: canonicalTrackedDestination(
            response.data?.tracking_link,
          ),
        },
      };
    } catch (error: any) {
      // URL validation above deliberately maps an unsafe provider response to
      // a stable 502. Preserve that boundary instead of wrapping it as a plain
      // Error (which Nest would render as an opaque 500).
      if (error instanceof HttpException) {
        throw error;
      }
      if (
        error.response?.data?.status_code === 401 &&
        authRetriesRemaining > 0
      ) {
        const authenticated = await this.signIn();
        return this.createDeeplinkInvolveWithToken(
          createInvolveDto,
          authenticated.data.token,
          authRetriesRemaining - 1,
        );
      }
      const wrappedError = new Error(
        error.message || 'Failed to create deeplink',
      ) as Error & { response?: unknown };
      wrappedError.response = error.response;
      throw wrappedError;
    }
  }

  /** Live lookup of a single Involve offer (used by admin commission fetch-best). */
  async findOfferByOfferId(
    offerId: number,
  ): Promise<Record<string, unknown> | null> {
    if (!Number.isFinite(offerId)) {
      return null;
    }
    try {
      let token = await this.cacheManager.get('access_token_involve');
      if (!token) {
        await this.signIn();
        token = await this.cacheManager.get('access_token_involve');
      }
      const res = await axios.post(
        `${this.endpoint}/offers/all`,
        {
          page: 1,
          limit: 1,
          filter: {
            offer_id: offerId,
            application_status: 'Approved',
            offer_status: 'Active',
            offer_type: 'cps',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const row = res.data?.data?.data?.[0];
      return row ?? null;
    } catch (error: any) {
      console.error(
        'Error findOfferByOfferId:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.findOfferByOfferId(offerId);
      }
      return null;
    }
  }

  async getOfferAll(pageFilter?: { page?: number; limit?: number }) {
    try {
      let token = await this.cacheManager.get('access_token_involve');
      if (!token) {
        await this.signIn();
        token = await this.cacheManager.get('access_token_involve');
      }
      const filter = {
        page: pageFilter?.page || 1,
        limit: pageFilter?.limit || 100,
      };
      const filters = {};
      filters['application_status'] = 'Approved'; //Approved|Blocked|Pending|Rejected
      filters['offer_status'] = 'Active'; //Active|Paused
      filters['offer_type'] = 'cps'; //cps|cpa|cpc
      const res = await axios.post(
        `${this.endpoint}/offers/all`,
        { page: filter.page, limit: filter.limit, filter: filters },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return res.data;
    } catch (error: any) {
      console.error('Error get offers:', error.response?.data || error.message);
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getOfferAll();
      }
      throw new Error(error.message || 'Failed to get offers');
    }
  }
  async findAll() {
    return this.categoryIntegrity.withNormalWrite({
      legacy: () => this.findAllLegacy(),
      enforced: () => this.findAllWithIntegrity(),
    });
  }

  private async findAllLegacy() {
    const res = await this.getOfferAll();
    let allOffers = res.data.data;
    let currentPage = 1;
    while (res.data.nextPage) {
      currentPage++;
      const nextOffers = await this.getOfferAll({ page: currentPage });
      allOffers = allOffers.concat(nextOffers.data.data);
      res.data.nextPage = nextOffers.data.nextPage;
    }
    const offers = Array.isArray(allOffers) ? allOffers : [];
    const ids = [];
    for (const offer of offers) {
      ids.push(offer.offer_id);
      await this.offerModel.updateOne(
        { source: { $in: ['involve', null] }, offer_id: offer.offer_id },
        {
          $set: {
            ...offer,
            source: 'involve',
            type: 'new',
            disabled: false,
          },
        },
        { upsert: true },
      );
    }
    if (ids.length > 0) {
      await this.offerModel.updateMany(
        { source: { $in: ['involve', null] }, offer_id: { $nin: ids } },
        { $set: { type: 'old', disabled: true } },
      );
    }
    const categoriesAll = await this.offerModel
      .find({})
      .select('categories')
      .exec();
    const uniqueCategories = new Set<unknown>();
    for (const offer of categoriesAll) {
      if (offer.categories) uniqueCategories.add(offer.categories);
    }
    for (const category of uniqueCategories) {
      await this.categoryModel.updateOne(
        { name: category },
        { $set: { name: category } },
        { upsert: true },
      );
    }
    return offers;
  }

  private async findAllWithIntegrity() {
    const res = await this.getOfferAll();
    let allOffers = res.data.data;
    let currentPage = 1;

    while (res.data.nextPage) {
      currentPage++;
      const nextOffers = await this.getOfferAll({ page: currentPage });
      allOffers = allOffers.concat(nextOffers.data.data);
      res.data.nextPage = nextOffers.data.nextPage;
    }
    // Save or update many offers in MongoDB
    const offers = Array.isArray(allOffers) ? allOffers : [];
    const ids = [];
    for (const offer of offers) {
      ids.push(offer.offer_id);
      const cleanupRequestKey = `involve-media-sync:${offer.offer_id}:v1`;
      let shouldProcessCleanup = false;
      // Scope the upsert to the Involve namespace: offer_id is only unique
      // WITHIN a source, so an Optimise/manual doc that happens to share this
      // numeric offer_id must never be clobbered. `$in: ['involve', null]`
      // matches legacy docs that predate the `source` field too. On insert,
      // $set stamps source:'involve' (the $in filter can't seed it).
      await this.categoryIntegrity.withInvolveCategoryAssignment(
        offer.categories,
        async (assignment, session) => {
          if (!session) {
            throw new Error(
              'Involve offer writes require an integrity transaction',
            );
          }
          const filter = {
            source: { $in: ['involve', null] },
            offer_id: offer.offer_id,
          } as never;
          const current = await this.offerModel
            .findOne(filter)
            .session(session)
            .lean();
          shouldProcessCleanup = Boolean(current);
          const {
            logo_asset: _providerLogoAsset,
            banner_asset: _providerBannerAsset,
            ...providerOffer
          } = offer as Record<string, unknown>;
          const unset: Record<string, 1> = {};
          const displaced = new Map<string, CommandOwnedStoredMediaAsset>();
          if (current) {
            const currentRecord = current as unknown as Record<string, unknown>;
            const logoAsset = commandOwnedProviderDisplacement(
              currentRecord.logo_asset,
            );
            const bannerAsset = commandOwnedProviderDisplacement(
              currentRecord.banner_asset,
            );
            for (const [assetField, fields, asset] of [
              ['logo_asset', INVOLVE_LOGO_FIELDS, logoAsset],
              ['banner_asset', INVOLVE_BANNER_FIELDS, bannerAsset],
            ] as const) {
              if (
                !asset ||
                !providerGroupReplacesAsset(providerOffer, fields, asset)
              ) {
                continue;
              }
              displaced.set(asset.object_key, asset);
              unset[assetField] = 1;
              for (const field of fields) {
                const supplied = providerOffer[field];
                if (
                  (typeof supplied !== 'string' || !supplied.trim()) &&
                  currentRecord[field] === asset.url
                ) {
                  unset[field] = 1;
                  delete providerOffer[field];
                }
              }
            }
          }
          if (displaced.size > 0) {
            const assets = [...displaced.values()];
            await this.policyMediaCleanup.journalCommandOwnedAssets(
              {
                owner_type: 'offer',
                owner_id: new Types.ObjectId(String(current!._id)),
                request_key: cleanupRequestKey,
                payload_hash: createHash('sha256')
                  .update(
                    JSON.stringify({
                      operation: 'involve-media-replacement',
                      offer_id: offer.offer_id,
                      assets: assets.map((asset) => ({
                        owner_key: asset.owner_key,
                        owner_attempt_token: asset.owner_attempt_token,
                        object_key: asset.object_key,
                        url: asset.url,
                        sha256: asset.sha256,
                      })),
                    }),
                  )
                  .digest('hex'),
                attempt_token: cleanupRequestKey,
                reason: 'replaced-after-commit',
                assets,
              },
              session,
            );
          }
          for (const url of new Set(
            [
              providerOffer.logo,
              providerOffer.logo_desktop,
              providerOffer.logo_mobile,
              providerOffer.logo_circle,
              providerOffer.banner,
              providerOffer.banner_mobile,
            ].filter(
              (value): value is string =>
                typeof value === 'string' && Boolean(value.trim()),
            ),
          )) {
            await this.policyMediaRegistry.touchAttachInSession(url, session);
          }
          return this.offerModel.updateOne(
            filter,
            {
              $set: {
                ...providerOffer,
                ...assignment,
                source: 'involve',
                type: 'new',
                disabled: false,
              },
              ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
            },
            { upsert: true, session },
          );
        },
      );
      if (shouldProcessCleanup) {
        try {
          const cleanup =
            await this.policyMediaCleanup.processRequest(cleanupRequestKey);
          if (cleanup.pending > 0) {
            this.logger.warn(
              `Involve media cleanup pending: request_key=${cleanupRequestKey} pending=${cleanup.pending}; raw offer was preserved.`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Involve media cleanup pending: request_key=${cleanupRequestKey}; raw offer was preserved; ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    // Disable stale Involve offers in ONE pass. The previous loop ran a
    // updateOne({ offer_id: { $ne: id } }) per id, which disabled ONE arbitrary
    // doc whose offer_id differed from the current id on each iteration —
    // including offers that ARE in `ids` and any Optimise/manual docs. That was
    // a pre-existing bug. A single source-scoped updateMany with offer_id $nin
    // ids disables exactly the Involve offers that vanished from this sync.
    //
    // GUARD: only run the disable pass when this sync actually returned offers.
    // `{ $nin: [] }` matches EVERY document, so an empty `ids` (a transient
    // upstream hiccup, a filter momentarily matching nothing, or a changed
    // response shape) would otherwise disable the ENTIRE live catalog in one
    // write — blacking out cashback platform-wide. The old per-id loop was a
    // no-op when ids was empty; this preserves that safety.
    if (ids.length > 0) {
      await this.categoryIntegrity.withIntegrityMutation((session) =>
        this.offerModel.updateMany(
          { source: { $in: ['involve', null] }, offer_id: { $nin: ids } },
          { $set: { type: 'old', disabled: true } },
          { session },
        ),
      );
    }

    await this.getCategoryList();
    return offers;
  }

  async getCategoryList() {
    const categoriesAll = await this.offerModel
      .find({})
      .select('categories')
      .exec();
    const uniqueCategories = new Set();
    categoriesAll.forEach((offer) => {
      if (offer.categories) {
        const categoriesArray = offer.categories;
        uniqueCategories.add(categoriesArray);
      }
    });
    return Array.from(uniqueCategories);
  }

  async checkOfferDuplicate() {
    const duplicateOffers = await this.offerModel.aggregate([
      { $group: { _id: '$offer_id', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return duplicateOffers;
  }

  update(id: number, updateInvolveDto: UpdateInvolveDto) {
    console.log(updateInvolveDto);

    return `This action updates a #${id} involve`;
  }

  remove(id: number) {
    return `This action removes a #${id} involve`;
  }
  async getConversion(
    offer_id: string,
    payload: RequestGetConversion,
    id: string,
  ) {
    if (!isValidObjectId(id)) {
      throw new Error('User not found');
    }
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new Error('User not found');
    }
    const id_user = user._id.toString();
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const res = await axios.post(
        `${this.endpoint}/conversions/all`,
        {
          page: payload.page || 1,
          limit: payload.limit || 100,
          filters: {
            offer_id: Number(offer_id),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const dt = res.data?.data?.data?.filter((item) =>
        item.aff_sub1?.includes(`user_id:${id_user}`),
      );
      const obj = {
        ...res.data,
        data: {
          ...res.data.data,
          count: dt.length,
          data: dt,
        },
      };
      return obj;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getConversion(offer_id, payload, id);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
    // return this.deeplinkModel.countDocuments({ offer_id: Number(offer_id) });
  }

  async getConversionAll(payload: RequestGetConversion, filter: any = null) {
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const filters = {
        page: payload.page || 1,
        limit: payload.limit || 100,
      };
      if (filter) {
        filters['filters'] = filter;
      }
      const res = await axios.post(
        `${this.endpoint}/conversions/all`,
        {
          ...filters,
          // filters: {
          //   offer_id: Number(offer_id),
          // },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getConversionAll(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversionRange(
    payload: RequestGetConversion,
    range: { start_date: string; end_date: string },
    filters: any = null,
  ) {
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const page = {
        page: payload.page?.toString() || '1',
        limit: payload.limit?.toString() || '100',
      };
      // if (filter) {
      //   // filters = { ...filters };
      // }
      // console.log('filter', filters);

      const res = await axios.post(
        `${this.endpoint}/conversions/range`,
        {
          ...page,
          ...range,
          filters: { ...filters },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getConversionRange(payload, range, filters);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversionRangeOld(
    payload: RequestGetConversion,
    filter: any = null,
  ) {
    let token = await this.cacheManager.get('access_token_involve_old');
    if (!token) {
      await this.signInOld();
      token = await this.cacheManager.get('access_token_involve_old');
    }
    try {
      let filters = {
        page: payload.page?.toString() || '1',
        limit: payload.limit?.toString() || '100',
      };
      if (filter) {
        filters = { ...filters, ...filter };
      }
      console.log('filter', filters);

      const res = await axios.post(
        `${this.endpoint}/conversions/range`,
        {
          ...filters,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signInOld();
        return this.getConversionAllOld(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversionAllOld(payload: RequestGetConversion, filter: any = null) {
    let token = await this.cacheManager.get('access_token_involve_old');
    if (!token) {
      await this.signInOld();
      token = await this.cacheManager.get('access_token_involve_old');
    }
    try {
      const filters = {
        page: payload.page || 1,
        limit: payload.limit || 100,
      };
      if (filter) {
        filters['filters'] = filter;
      }
      const res = await axios.post(
        `${this.endpoint}/conversions/all`,
        {
          ...filters,
          // filters: {
          //   offer_id: Number(offer_id),
          // },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signInOld();
        return this.getConversionAllOld(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversationAllPage(payload: RequestGetConversion, id: string) {
    // const conversions = await this.getConversionAll({
    //   page: payload.page || '1',
    //   limit: payload.limit || '10',
    // });

    // let allConversions = conversions.data.data;
    // let currentPage = 1;

    // while (conversions.data.nextPage) {
    //   currentPage++;
    //   const nextConversions = await this.getConversionAll({
    //     page: currentPage.toString(),
    //     limit: payload.limit || '10',
    //   });
    //   allConversions = allConversions.concat(nextConversions.data.data);
    //   conversions.data.nextPage = nextConversions.data.nextPage;
    // }
    // old version
    if (payload && 'data' in payload && payload.data) {
      payload = payload.data as RequestGetConversion;
    }
    if (!isValidObjectId(id)) {
      throw new Error('User not found');
    }
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new Error('User not found');
    }
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      throw new HttpException({ message: 'Fee rate not found' }, 400);
    }
    // const allConversions = await this.conversionModel
    //   .find({
    //     aff_sub1: { $regex: `user_id:${id}` },
    //   })
    //   .sort({ datetime_conversion: -1 })
    //   .lean();
    const allConversions = await this.conversionModel
      .aggregate([
        {
          $match: buildUserConversionScopeFilter(user._id),
        },
        {
          // Source-constrained lookup: offer_id is only unique WITHIN a source
          // (Involve vs Optimise/Accesstrade can share a numeric offer_id). A
          // naive localField/foreignField join would match both and $unwind
          // would double-count the conversion's payout. Pin offer.source to the
          // CONVERSION's own source ($ifNull -> 'involve' for legacy rows that
          // predate the schema field) so each conversion joins only its own
          // network's offer. For Involve-only data $$src === 'involve', i.e.
          // byte-identical to the previous hardcoded literal.
          $lookup: {
            from: 'offers',
            let: { oid: '$offer_id', src: { $ifNull: ['$source', 'involve'] } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
                      { $eq: ['$offer_id', '$$oid'] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'offer',
          },
        },
        { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            max_cap: { $ifNull: ['$offer.max_cap', fee.max_cap] },
          },
        },
        {
          $addFields: {
            payoutNew: {
              $cond: [
                { $eq: ['$offer_name', 'reward_conversion_quest'] },
                '$payout',
                {
                  $let: {
                    vars: {
                      payoutAfterFee: {
                        $subtract: [
                          '$payout',
                          {
                            $divide: [
                              { $multiply: ['$payout', fee.system] },
                              100,
                            ],
                          },
                        ],
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: ['$$payoutAfterFee', '$max_cap'] },
                        '$max_cap',
                        '$$payoutAfterFee',
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            conversion_id: 1,
            adv_sub1: 1,
            adv_sub2: 1,
            adv_sub3: 1,
            adv_sub4: 1,
            adv_sub5: 1,
            aff_sub1: 1,
            aff_sub2: 1,
            aff_sub3: 1,
            aff_sub4: 1,
            aff_sub5: 1,
            affiliate_remarks: 1,
            base_payout: 1,
            bonus_payout: 1,
            conversion_status: 1,
            currency: 1,
            datetime_conversion: 1,
            merchant_id: 1,
            offer_id: 1,
            offer_name: 1,
            payout: 1,
            sale_amount: 1,
            add_point: 1,
            payoutNew: 1,
            _id: 1,
          },
        },
        // {
        //   $group: {
        //     _id: {
        //       merchant_id: '$merchant_id',
        //       offer_name: '$offer.offer_name',
        //     },
        //     count: { $sum: 1 },
        //     totalPayout: { $sum: '$payoutNew' },
        //   },
        // },
        {
          $sort: { datetime_conversion: -1 },
        },
      ])
      .exec();
    // const fee = await this.feeRateModel.findOne().exec();

    // const conversationByUser = [];
    // for (const conversion of allConversions) {
    //   // const payout =
    //   //   conversion.offer_name === 'reward_conversion_quest'
    //   //     ? conversion.payout
    //   //     : conversion.payout >= fee.max_cap
    //   //       ? fee.max_cap
    //   //       : conversion.payout;
    //   // @TODO ลบ feePercent ออก 30%

    //   const payout = conversion.payoutNew || 0;
    //   conversationByUser.push({ ...conversion, payout: payout });
    // }
    const totalUSDApproved = await allConversions
      ?.filter((ele) => ele.conversion_status === 'approved')
      ?.reduce(async (accPromise, item) => {
        const acc = await accPromise;
        // const payout =
        //   Number(item.payout || 0) >= fee.max_cap
        //     ? Number(fee.max_cap)
        //     : Number(item.payout || 0);
        const payout = item.payoutNew || 0;
        if (item.currency === 'USD') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { usdAmount } = await convertToUSD(item.currency, payout);
          if (usdAmount) {
            return acc + usdAmount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    const totalUSDPending = await allConversions
      ?.filter((ele) => ele.conversion_status === 'pending')
      .reduce(async (accPromise, item) => {
        const acc = await accPromise;
        // const payout =
        //   Number(item.payout || 0) >= fee.max_cap
        //     ? Number(fee.max_cap)
        //     : Number(item.payout || 0);
        const payout = item.payoutNew || 0;
        if (item.currency === 'USD') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { usdAmount } = await convertToUSD(item.currency, payout);
          if (usdAmount) {
            return acc + usdAmount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    const totalTHBPending = await allConversions
      ?.filter((ele) => ele.conversion_status === 'pending')
      .reduce(async (accPromise, item) => {
        const acc = await accPromise;
        // const payout =
        //   Number(item.payout || 0) >= fee.max_cap
        //     ? Number(fee.max_cap)
        //     : Number(item.payout || 0);
        const payout = item.payoutNew || 0;
        if (item.currency === 'THB') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { amount } = await convertToTHB(item.currency, payout);
          if (amount) {
            return acc + amount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    const totalTHBApproved = await allConversions
      ?.filter((ele) => ele.conversion_status === 'approved')
      .reduce(async (accPromise, item) => {
        const acc = await accPromise;
        const payout = item.payoutNew || 0;
        if (item.currency === 'THB') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { amount } = await convertToTHB(item.currency, payout);
          if (amount) {
            return acc + amount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    return {
      data: allConversions,
      totalUSD: { pending: totalUSDPending, approved: totalUSDApproved },
      totalTHB: { pending: totalTHBPending, approved: totalTHBApproved },
      pagination: {
        total: allConversions.length,
        limit: payload?.limit || 10,
        page: payload?.page || 1,
        totalPages: Math.ceil(
          allConversions.length / Number(payload?.limit || 10),
        ),
      },
    };
  }
}
