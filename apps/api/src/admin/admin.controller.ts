import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import {
  MAX_TRACKING_PERIOD_DAYS,
  MIN_TRACKING_PERIOD_DAYS,
} from 'src/offer/tracking-period.util';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import {
  CreateAdminDto,
  LoginAdminDto,
  RegisterAdminDto,
} from './dto/create-admin.dto';
import {
  ApproveOfferDto,
  RejectOfferDto,
  UpdateAdminDto,
  UpdateBannerHomeBodyDto,
  UpdateBannerHomeDto,
  UpdateFeeRateDto,
  UpdateOfferAdminDto,
  UpdateRequestWithdrawDto,
  UpdateUserDto,
} from './dto/update-admin.dto';
import { UserAdminService } from './user-admin/user-admin-service';
import { AdminInviteService } from './admin-invite.service';
import {
  AcceptInviteDto,
  AdminForgotPasswordDto,
  AdminResetPasswordDto,
  InviteAdminUserDto,
} from './dto/admin-auth.dto';
import { ApiBearerAuth, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { parseOfferDisplayTagsField } from 'src/offer/offer-display-tags.util';
import { AuthAdminGuard } from './jwt-auth-admin.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Public } from './public.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

// Strip unknown fields + coerce types on the unauthenticated admin-auth
// endpoints (no global ValidationPipe in this app).
const adminAuthValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
});

function coerceOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized || normalized === 'undefined') return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Tracking-period day counts: absent stays undefined (partial saves must not
 * touch the field), but a present-and-invalid value REJECTS rather than being
 * silently dropped — an admin who typed a number must not see it vanish.
 */
function coerceOptionalDayCount(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized || normalized === 'undefined') return undefined;
    value = Number(normalized);
  }
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_TRACKING_PERIOD_DAYS ||
    value > MAX_TRACKING_PERIOD_DAYS
  ) {
    throw new BadRequestException(
      `Invalid ${label}: expected a whole number of days between ${MIN_TRACKING_PERIOD_DAYS} and ${MAX_TRACKING_PERIOD_DAYS}`,
    );
  }
  return value;
}

/**
 * Multipart optional text: absent or the "undefined" sentinel stays undefined
 * (partial saves must not touch the field). An empty string passes through —
 * it is an explicit clear from the admin form.
 */
function coerceOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value.trim() === 'undefined') return undefined;
  return value;
}

type AdminRoleDef = {
  id: string;
  label: string;
  description: string;
  system: boolean;
  permissions: string[];
};

const ADMIN_ROLE_PERMISSIONS = [
  'dashboard',
  'users',
  'adminUsers',
  'brands',
  'withdraw',
  'fee',
  'conversion',
  'banner',
  'coupon',
  'quest',
] as const;

const allViewPermissions = ADMIN_ROLE_PERMISSIONS.map(
  (resource) => `${resource}:view`,
);
const allManagePermissions = ADMIN_ROLE_PERMISSIONS.map(
  (resource) => `${resource}:manage`,
);

const builtInAdminRoles: AdminRoleDef[] = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Full access, including managing admin users and roles.',
    system: true,
    permissions: [
      ...allViewPermissions,
      ...allManagePermissions,
      'withdraw:approve',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Full operational access; cannot manage admin users.',
    system: true,
    permissions: [
      ...allViewPermissions,
      ...allManagePermissions.filter(
        (permission) => permission !== 'adminUsers:manage',
      ),
      'withdraw:approve',
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    description:
      'Manage content (brands, banners, coupons, quests, conversions); read the rest.',
    system: true,
    permissions: [
      ...allViewPermissions,
      'brands:manage',
      'banner:manage',
      'coupon:manage',
      'quest:manage',
      'conversion:manage',
    ],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to everything.',
    system: true,
    permissions: allViewPermissions,
  },
];

// Admin auth is enforced at the CLASS level so every route fails closed by
// default; genuinely public routes opt out explicitly with @Public(). This is
// the structural fix for routes that were silently exposed by a missing guard.
@UseGuards(AuthAdminGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userAdminService: UserAdminService,
    private readonly adminInviteService: AdminInviteService,
  ) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: LoginAdminDto })
  @Post('login')
  login(@Body() createAdminDto: LoginAdminDto) {
    return this.userAdminService.login(createAdminDto);
  }

  // ─── Admin invite + password reset (Resend-backed) ───

  // Only superadmins may invite new admins (prevents a lower-privilege admin
  // from minting a superadmin account). RolesGuard runs after AuthAdminGuard so
  // req.user.role is populated; it normalises UI/API role vocabularies.
  @UseGuards(RateLimitGuard, AuthAdminGuard, RolesGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @Roles('superadmin')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: InviteAdminUserDto })
  @Post('invite')
  invite(@Body(adminAuthValidation) body: InviteAdminUserDto) {
    return this.adminInviteService.invite(body.email, body.role);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: AcceptInviteDto })
  @Post('accept-invite')
  acceptInvite(@Body(adminAuthValidation) body: AcceptInviteDto) {
    return this.adminInviteService.acceptInvite(body);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: AdminForgotPasswordDto })
  @Post('forgot-password')
  forgotPassword(@Body(adminAuthValidation) body: AdminForgotPasswordDto) {
    return this.adminInviteService.forgotPassword(body.email);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  @ApiBody({ type: AdminResetPasswordDto })
  @Post('reset-password')
  resetPassword(@Body(adminAuthValidation) body: AdminResetPasswordDto) {
    return this.adminInviteService.resetPassword(body);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: Request) {
    const user = req['user'] as any;
    return this.userAdminService.findById(user?.sub);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('roles')
  getRoles() {
    return {
      data: builtInAdminRoles.map((role) => ({
        ...role,
        permissions: [...role.permissions],
      })),
    };
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('created-conversions')
  getCreatedConversions(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.adminService.getCreatedConversions(
      Number(limit) || 10,
      Number(page) || 1,
    );
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('top-brands')
  getTopBrands() {
    return this.adminService.getTopBrands();
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  // Homepage merchandising config (writes the banner config doc) — a mutation,
  // so it must not be reachable by a read-only viewer.
  @Roles('approver')
  @Put('top-brands')
  saveTopBrands(
    @Body() body: { brands: { offerId: string; cashback: string }[] },
  ) {
    return this.adminService.saveTopBrands(body.brands);
  }

  // Creating an admin account is a superadmin action (parallels the gated
  // invite flow); without this gate any authenticated admin could mint a
  // superadmin via a mass-assigned role.
  @UseGuards(AuthAdminGuard, RolesGuard)
  @Roles('superadmin')
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @ApiBody({ type: RegisterAdminDto })
  @Post('register')
  register(@Body() createAdminDto: RegisterAdminDto) {
    return this.userAdminService.register(createAdminDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  // @ApiHeader({
  //   name: 'Authorization',
  //   description: 'Bearer token',
  //   required: true,
  //   schema: {
  //     type: 'string',
  //     example: 'Bearer eyJhb',
  //   },
  // })
  // Dead stub today (returns a string, no DB write). Guarded at superadmin so
  // it can never be implemented open by a later edit without a deliberate review.
  @Roles('superadmin')
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('withdraw-all')
  withdrawAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
  ) {
    // return this.adminService.findAll(page, limit, search);
    return this.adminService.getWithdrawAll(page, limit, search);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('conversion-all')
  getConversionAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('key') key?: string,
  ) {
    return this.adminService.getConversionAll(
      Number(page),
      Number(limit),
      search,
      key,
      status,
    );
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('getConversionInWithdraw')
  getConversionInWithdraw(@Body() body: { data: number[] }) {
    return this.adminService.getConversionInWithdraw(body.data);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('get-fee-rate')
  getFeeRate() {
    return this.adminService.getFeeRate();
  }

  @UseGuards(AuthAdminGuard)
  @ApiBody({ type: UpdateFeeRateDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Roles('superadmin')
  @Patch('update-fee-rate/:id')
  updateFeeRate(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateFeeRateDto,
  ) {
    return this.adminService.updateFeeRate(updateAdminDto, id);
  }
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.adminService.findOne(id);
  // }
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Roles('approver')
  @Patch('update-request-withdraw')
  updateRequestWithdraw(
    @UploadedFile() file: Express.Multer.File,
    @Body() updateAdminDto: UpdateRequestWithdrawDto,
  ) {
    return this.adminService.updateRequestWithdraw(updateAdminDto, file);
  }

  // Admin-account management (change role / delete). Superadmin-only: these
  // catch-all :id routes previously had NO guard at all, allowing anonymous
  // mass-assignment of role:'superadmin' onto any admin record.
  @UseGuards(AuthAdminGuard, RolesGuard)
  @Roles('superadmin')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @Roles('superadmin')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get()
  findAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAll(page, limit, search);
  }

  // @UseInterceptors(
  //   FileInterceptor('logo_desktop'),
  //   // FileInterceptor('logo_mobile'),
  // )
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo_desktop', maxCount: 1 },
      { name: 'logo_mobile', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo_circle', maxCount: 1 },
      { name: 'banner_mobile', maxCount: 1 },
    ]),
  )
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  // Edits commission_store / max_cap (cashback economics, fee-like) alongside
  // offer content — raised from approver to superadmin per the Phase-2 review.
  @Roles('superadmin')
  @Patch('update-offer/:id')
  updateOffer(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateOfferAdminDto,
    @UploadedFiles()
    files: {
      banner_mobile?: Express.Multer.File[];
      logo_desktop?: Express.Multer.File[];
      logo_mobile?: Express.Multer.File[];
      banner?: Express.Multer.File[];
      logo_circle?: Express.Multer.File[];
    },
  ) {
    return this.adminService.updateOffer(id, {
      logo_desktop: files?.logo_desktop ? files?.logo_desktop?.[0] : null,
      logo_mobile: files?.logo_mobile ? files?.logo_mobile?.[0] : null,
      banner: files?.banner ? files?.banner?.[0] : null,
      banner_mobile: files?.banner_mobile ? files?.banner_mobile?.[0] : null,
      logo_circle: files?.logo_circle ? files?.logo_circle?.[0] : null,
      offer_name_display: updateAdminDto.offer_name_display,
      lookup_value: updateAdminDto.lookup_value,
      offer_display_tags: parseOfferDisplayTagsField(
        updateAdminDto.offer_display_tags,
      ),
      disabled: coerceOptionalBoolean(updateAdminDto?.disabled),
      commission_store: coerceOptionalNumber(updateAdminDto.commission_store),
      max_cap: coerceOptionalNumber(updateAdminDto.max_cap),
      extra_store: coerceOptionalBoolean(updateAdminDto.extra_store),
      tracking_link:
        updateAdminDto.tracking_link &&
        updateAdminDto.tracking_link.toString() !== 'undefined'
          ? updateAdminDto.tracking_link
          : undefined,
      product_type: updateAdminDto.product_type,
      tracking_period_mode: updateAdminDto.tracking_period_mode,
      tracking_days: coerceOptionalDayCount(
        updateAdminDto.tracking_days,
        'tracking_days',
      ),
      confirm_days: coerceOptionalDayCount(
        updateAdminDto.confirm_days,
        'confirm_days',
      ),
      policy_category_id: coerceOptionalText(updateAdminDto.policy_category_id),
      custom_terms: coerceOptionalText(updateAdminDto.custom_terms),
      note_to_user: coerceOptionalText(updateAdminDto.note_to_user),
    });
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: ApproveOfferDto })
  @Roles('approver')
  @Post('offer/:id/approve')
  approveOffer(
    @Param('id') id: string,
    @Body() _body: ApproveOfferDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { sub?: string } | undefined;
    const adminId = user?.sub ?? 'unknown';
    return this.adminService.approveOffer(id, adminId);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: RejectOfferDto })
  @Roles('approver')
  @Post('offer/:id/reject')
  rejectOffer(
    @Param('id') id: string,
    @Body() body: RejectOfferDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as { sub?: string } | undefined;
    const adminId = user?.sub ?? 'unknown';
    return this.adminService.rejectOffer(id, adminId, body.reason);
  }

  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('support')
  @Patch('update-category/:id')
  updateCategory(
    @Param('id') id: string,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ) {
    return this.adminService.updateCategory(id, {
      image: files?.image ? files?.image?.[0] : null,
    });
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiBody({ type: UpdateUserDto })
  @Roles('superadmin')
  @Post('update-user/:id')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto?.mobile);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiBody({ type: UpdateUserDto })
  @Get('get-mycashback-user/:id')
  viewMyCahsback(@Param('id') id: string) {
    return this.adminService.getMyCashBackUser(id);
  }

  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_1', maxCount: 1 },
      { name: 'image_2', maxCount: 1 },
      { name: 'image_3', maxCount: 1 },
      { name: 'image_4', maxCount: 1 },
      { name: 'image_5', maxCount: 1 },
    ]),
  )
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiBody({ type: UpdateBannerHomeBodyDto })
  @Roles('support')
  @Post('banner-home')
  updateBannerHome(
    @UploadedFiles()
    files: {
      image_1?: Express.Multer.File[];
      image_2?: Express.Multer.File[];
      image_3?: Express.Multer.File[];
      image_4?: Express.Multer.File[];
      image_5?: Express.Multer.File[];
    },
    @Body() body: UpdateBannerHomeBodyDto,
  ) {
    const filesDto: UpdateBannerHomeDto = {
      image_1: files?.image_1 ? (files?.image_1?.[0] as any) : null,
      image_2: files?.image_2 ? (files?.image_2?.[0] as any) : null,
      image_3: files?.image_3 ? (files?.image_3?.[0] as any) : null,
      image_4: files?.image_4 ? (files?.image_4?.[0] as any) : null,
      image_5: files?.image_5 ? (files?.image_5?.[0] as any) : null,
      link_1: body.link_1 ?? null,
      link_2: body.link_2 ?? null,
      link_3: body.link_3 ?? null,
      link_4: body.link_4 ?? null,
      link_5: body.link_5 ?? null,
      enabled_1: coerceOptionalBoolean(body.enabled_1),
      enabled_2: coerceOptionalBoolean(body.enabled_2),
      enabled_3: coerceOptionalBoolean(body.enabled_3),
      enabled_4: coerceOptionalBoolean(body.enabled_4),
      enabled_5: coerceOptionalBoolean(body.enabled_5),
      start_date_1: body.start_date_1,
      start_date_2: body.start_date_2,
      start_date_3: body.start_date_3,
      start_date_4: body.start_date_4,
      start_date_5: body.start_date_5,
      end_date_1: body.end_date_1,
      end_date_2: body.end_date_2,
      end_date_3: body.end_date_3,
      end_date_4: body.end_date_4,
      end_date_5: body.end_date_5,
      clear_image_1: coerceOptionalBoolean(body.clear_image_1),
      clear_image_2: coerceOptionalBoolean(body.clear_image_2),
      clear_image_3: coerceOptionalBoolean(body.clear_image_3),
      clear_image_4: coerceOptionalBoolean(body.clear_image_4),
      clear_image_5: coerceOptionalBoolean(body.clear_image_5),
    };
    return this.adminService.updateBannerHome(filesDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('banner-home')
  getBannerHome() {
    return this.adminService.getBannerHome();
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('stored-media/stream')
  async streamStoredMedia(@Query('ref') ref: string, @Res() res: Response) {
    const { stream, contentType } =
      await this.adminService.streamStoredMedia(ref);
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Roles('approver')
  @Patch('update-conversion/:id')
  updateConversionDataByConversionId(@Param('id') id: string) {
    // console.log('Updating conversion data for ID:', id);
    return this.adminService.updateConversionDataByConversionId(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('get-deep-link-list')
  getDeepLinkList() {
    // console.log('Updating conversion data for ID:', id);
    return this.adminService.getDeepLinkList();
  }
}
