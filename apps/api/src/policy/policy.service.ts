import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from 'src/offer/schemas/category.schema';
import {
  ALLOWED_POLICY_LOCALES,
  Policy,
  PolicyDocument,
} from './schemas/policy.schema';
import { PolicyContentDto, UpsertPolicyDto } from './dto/upsert-policy.dto';

/**
 * Per-locale text size cap. Mirrors the Admin's existing STORED_MAX_LENGTH
 * (50_000 chars per locale) so the database can never receive payloads
 * larger than the editor allows.
 */
const MAX_TRANSLATION_LENGTH = 50_000;

@Injectable()
export class PolicyService {
  private readonly allowedLocales = new Set<string>(ALLOWED_POLICY_LOCALES);

  constructor(
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  /** Public read — fetch a category's policy for customer-side rendering.
   *  Returns null when no policy has been authored yet (the customer-side
   *  reader treats null as "section hidden"). */
  async findByCategory(categoryId: string) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category id');
    }
    return this.policyModel
      .findOne({ category_id: new Types.ObjectId(categoryId) })
      .lean();
  }

  /** Public read — list all policies. Used by the Admin index view to show
   *  which categories have policies authored. Plain documents only — no
   *  joins; the Admin already has Category metadata locally. */
  async list() {
    return this.policyModel.find().sort({ updatedAt: -1 }).lean();
  }

  /** Admin write — upsert (create-or-replace) the policy for a category.
   *
   *  Validation order (fail fast on cheapest checks):
   *  1. category_id refers to a real Category (404 if not)
   *  2. a first policy write includes terms; clear flags do not conflict
   *  3. banner.translations / terms.translations only use allow-listed locales
   *  4. each provided block has at least one non-empty translation
   *  5. each translation is within MAX_TRANSLATION_LENGTH
   */
  async upsert(dto: UpsertPolicyDto) {
    const categoryId = new Types.ObjectId(dto.category_id);
    const categoryExists = await this.categoryModel
      .exists({ _id: categoryId })
      .lean();
    if (!categoryExists) {
      throw new NotFoundException('Category not found');
    }

    if (dto.terms && dto.clear_terms) {
      throw new BadRequestException(
        'terms and clear_terms cannot be sent together',
      );
    }
    if (dto.banner && dto.clear_banner) {
      throw new BadRequestException(
        'banner and clear_banner cannot be sent together',
      );
    }

    const existingPolicy = await this.policyModel.exists({
      category_id: categoryId,
    });
    if (!existingPolicy && (!dto.terms || dto.clear_terms)) {
      throw new BadRequestException(
        'Terms & conditions are required for a new policy.',
      );
    }

    if (dto.banner) this.validateContent(dto.banner, 'banner');
    if (dto.terms) this.validateContent(dto.terms, 'terms');

    const $set: Partial<Policy> = {};
    if (dto.banner) $set.banner = this.normaliseContent(dto.banner);
    if (dto.terms) $set.terms = this.normaliseContent(dto.terms);
    const $unset: { banner?: 1; terms?: 1 } = {};
    if (dto.clear_banner) $unset.banner = 1;
    if (dto.clear_terms) $unset.terms = 1;
    const update = {
      $set,
      ...(Object.keys($unset).length > 0 ? { $unset } : {}),
    };

    return this.policyModel
      .findOneAndUpdate({ category_id: categoryId }, update, {
        upsert: !existingPolicy,
        new: true,
        setDefaultsOnInsert: true,
      })
      .lean();
  }

  /** Admin write — delete a policy entirely. Idempotent. */
  async remove(categoryId: string) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category id');
    }
    const result = await this.policyModel.deleteOne({
      category_id: new Types.ObjectId(categoryId),
    });
    return { deleted: result.deletedCount > 0 };
  }

  private validateContent(content: PolicyContentDto, label: string) {
    // Locale allow-list (primary_locale is enforced via class-validator
    // already; translation keys are not).
    for (const locale of Object.keys(content.translations ?? {})) {
      if (!this.allowedLocales.has(locale)) {
        throw new BadRequestException(
          `${label}.translations contains unsupported locale "${locale}". Allowed: ${[...this.allowedLocales].join(', ')}`,
        );
      }
    }
    if (
      content.additional_terms &&
      Object.keys(content.additional_terms).some(
        (l) => !this.allowedLocales.has(l),
      )
    ) {
      throw new BadRequestException(
        `${label}.additional_terms contains an unsupported locale`,
      );
    }

    // D4: at least one non-empty translation.
    const hasAny = Object.values(content.translations ?? {}).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    if (!hasAny) {
      throw new BadRequestException(
        `${label} requires at least one non-empty translation`,
      );
    }

    // Length cap.
    for (const [locale, text] of Object.entries(content.translations ?? {})) {
      if (typeof text === 'string' && text.length > MAX_TRANSLATION_LENGTH) {
        throw new BadRequestException(
          `${label}.translations.${locale} exceeds ${MAX_TRANSLATION_LENGTH} characters`,
        );
      }
    }

    // primary_locale should appear in translations OR be addable later.
    // Not strictly required (admin might add primary text in a follow-up
    // save), but warn-shape: silently allowed for now.
  }

  /** Drop empty-string translations so the document doesn't carry
   *  meaningless keys; these would otherwise complicate the customer-side
   *  fallback chain. */
  private normaliseContent(content: PolicyContentDto): PolicyContentDto {
    const cleaned: PolicyContentDto = {
      primary_locale: content.primary_locale,
      translations: {},
      content_source: content.content_source,
      template_id: content.template_id,
      additional_terms: content.additional_terms
        ? { ...content.additional_terms }
        : undefined,
    };
    for (const [k, v] of Object.entries(content.translations ?? {})) {
      if (typeof v === 'string' && v.trim().length > 0) {
        cleaned.translations[k] = v;
      }
    }
    return cleaned;
  }
}
