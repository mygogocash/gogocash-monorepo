import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import {
  CreateManualWithdrawRequestDto,
  CreateWithdrawDto,
  GETSignDTO,
  GetWithdrawTransactionsDTO,
  MarkWithdrawPaidDto,
  PreviewWithdrawFeeDto,
  RequestCreateRewardList,
} from './dto/create-withdraw.dto';
import {
  CreateWithdrawMethod,
  UpdateWithdrawDto,
} from './dto/update-withdraw.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { extractAnalyticsContext } from 'src/analytics/analytics-context';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { amountBand } from 'src/analytics/amount-band';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RolesGuard } from 'src/admin/roles.guard';
import { Roles } from 'src/admin/roles.decorator';
import { requireAdminActor } from 'src/admin/activity/admin-activity.actor';
import { RequestCreateConversionReward } from 'src/user/dto/create-conversion-reward.dto';
@Controller('withdraw')
export class WithdrawController {
  constructor(
    private readonly withdrawService: WithdrawService,
    private readonly analytics: AnalyticsService,
  ) {}

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: GETSignDTO })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('signature')
  getSign(@Req() req: Request, @Body() createWithdrawDto: GETSignDTO) {
    const user = req['user'] as { sub?: string } | undefined;
    return this.withdrawService.getSign(createWithdrawDto, user?.sub);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('check')
  checkWithdraw(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.checkWithdraw(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('check-admin/:userId')
  checkWithdrawGGCAdmin(@Req() req: Request, @Param('userId') userId: string) {
    return this.withdrawService.checkWithdraw(userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('list-check')
  listCheckWithdraw(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    // return this.withdrawService.listCheckWithdraw(id);

    return this.withdrawService.listCheckWithdrawNew(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('list-check-admin/:userId')
  listCheckWithdrawAdmin(@Req() req: Request, @Param('userId') userId: string) {
    return this.withdrawService.listCheckWithdrawNew(userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('check-my-cashback')
  checkWithdrawMyCashback(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.checkWithdrawMyCashback(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('check-my-cashback-admin/:userId')
  checkWithdrawMyCashbackAdmin(
    @Req() req: Request,
    @Param('userId') userId: string,
  ) {
    return this.withdrawService.checkWithdrawMyCashback(userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post()
  create(
    @Req() req: Request,
    @Body() createWithdrawDto: CreateWithdrawDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.captureWithdrawRequested(
      req,
      id,
      createWithdrawDto,
      this.withdrawService.create(createWithdrawDto, id, idempotencyKey),
    );
  }

  /**
   * PDPA-safe withdraw funnel event. Fires `withdraw_requested` only AFTER the
   * underlying create resolves (a rejected create never emits a success event),
   * and carries only the method type + coarse amount band + currency — never
   * the bank/account/wallet details on the DTO.
   */
  private async captureWithdrawRequested<T>(
    req: Request,
    userId: string | undefined,
    dto: CreateWithdrawDto,
    work: Promise<T>,
    methodFallback?: string,
  ): Promise<T> {
    const result = await work;
    const ctx = extractAnalyticsContext(req, { userId });
    void this.analytics.capture('withdraw_requested', ctx, {
      method: dto.method ?? methodFallback,
      amount_band: amountBand(dto.amount_total ?? dto.amount_net),
      currency: dto.currency,
    });
    return result;
  }

  /**
   * MiniPay manual withdraw request. Stores a `withdraw_mode: "manual"`
   * record in `pending`; admin fulfils externally and flips to `paid` via
   * `PATCH /withdraw/:id/mark-paid`. USDT or USDC on Celo only.
   */
  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateManualWithdrawRequestDto })
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('request-manual')
  createManualRequest(
    @Req() req: Request,
    @Body() body: CreateManualWithdrawRequestDto,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.createManualWithdrawRequest(body, id);
  }

  /**
   * Admin action: mark a manual withdraw request as paid. Takes the on-chain
   * tx hash of the admin-side payout and stamps `paid_by` + `paid_at`.
   */
  @UseGuards(AuthAdminGuard, RolesGuard)
  @Roles('approver')
  @ApiBody({ type: MarkWithdrawPaidDto })
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Patch(':id/mark-paid')
  markPaid(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: MarkWithdrawPaidDto,
  ) {
    return this.withdrawService.markWithdrawPaid(
      id,
      body,
      requireAdminActor(req),
    );
  }

  /**
   * Admin action (V-2b): approve a pending withdrawal (confirm on-chain
   * settlement). Replaces the removed client-tx_hash -> 'approved' self-promotion
   * in POST /withdraw.
   */
  @UseGuards(AuthAdminGuard, RolesGuard)
  @Roles('approver')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Patch(':id/approve')
  approveWithdraw(@Req() req: Request, @Param('id') id: string) {
    return this.withdrawService.approveWithdrawRequest(
      id,
      requireAdminActor(req),
    );
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: PreviewWithdrawFeeDto })
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('preview-fee')
  previewWithdrawFee(@Req() req: Request, @Body() body: PreviewWithdrawFeeDto) {
    const user = req['user'] as { sub?: string };
    const id = user?.sub;
    return this.withdrawService.previewWithdrawFee(body, id as string);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('bank-transfer')
  createBankTransfer(
    @Req() req: Request,
    @Body() createWithdrawDto: CreateWithdrawDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.captureWithdrawRequested(
      req,
      id,
      createWithdrawDto,
      this.withdrawService.createBankTransfer(
        createWithdrawDto,
        id,
        idempotencyKey,
      ),
      'bank_transfer',
    );
  }

  @UseGuards(FirebaseAuthGuard)
  // @ApiBody({ type: GetWithdrawTransactionsDTO })
  @ApiQuery({ type: GetWithdrawTransactionsDTO })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Transaction status',
  })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get()
  findAll(@Param() params: GetWithdrawTransactionsDTO, @Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.findAll(params, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('detail/:id')
  withdrawDetail(@Req() req: Request, @Param('id') id: string) {
    // IDOR fix: scope the lookup to the authenticated requester so a user can
    // only read their own withdrawal (was readable for ANY ObjectId, leaking
    // email/mobile/amount/tx_hash).
    const requesterId = (req.user as { sub?: string } | undefined)?.sub;
    return this.withdrawService.detailWithdraw(id, requesterId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: GETSignDTO })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWithdrawDto: UpdateWithdrawDto,
  ) {
    return this.withdrawService.update(id, updateWithdrawDto);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.withdrawService.remove(+id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawMethod })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Post('methods')
  createWithdrawMethod(
    @Body() createWithdrawMethod: CreateWithdrawMethod,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    // const analyticsContext = extractAnalyticsContext(req, {
    //   userId: id,
    // });
    return this.withdrawService.createWithdrawMethod(createWithdrawMethod, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('banks')
  getBankList() {
    return this.withdrawService.getBankList();
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('methods/:id')
  getMethodId(@Param('id') id: string, @Req() req: Request) {
    // V-3 IDOR: scope to the authenticated caller so a member can only read
    // their own saved payout method (was readable for ANY method ObjectId).
    const userId = (req.user as { sub?: string } | undefined)?.sub;
    return this.withdrawService.getMethodId(id, userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('methods-list')
  getMethodList(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.getMethodList(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawMethod })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Delete('methods/:id')
  deleteMethodData(@Param('id') id: string, @Req() req: Request) {
    // V-3 IDOR: scope to the authenticated caller so a member cannot delete
    // another user's saved payout method by guessing its _id.
    const userId = (req.user as { sub?: string } | undefined)?.sub;
    return this.withdrawService.deleteMethodData(id, userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawMethod })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Patch('methods/:id')
  updateMethodData(
    @Param('id') id: string,
    @Body() body: CreateWithdrawMethod,
    @Req() req: Request,
  ) {
    // V-3 IDOR: scope to the authenticated caller so a member cannot overwrite
    // another user's bank details (payout redirect) by guessing its _id.
    const userId = (req.user as { sub?: string } | undefined)?.sub;
    return this.withdrawService.updateMethodData(id, userId, body);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.withdrawService.findOne(+id);
  // }

  @UseGuards(AuthAdminGuard)
  @Patch('admin/add-reward-conversion')
  async adminAddRewardConversion() {
    return this.withdrawService.adminAddRewardConversionForQuest();
  }

  @UseGuards(AuthAdminGuard)
  @ApiBody({ type: RequestCreateRewardList })
  @Post('create-reward-list')
  async createRewardList(@Body() body: RequestCreateRewardList) {
    return this.withdrawService.createRewardList(body);
  }

  @UseGuards(AuthAdminGuard)
  @Post('create-conversion-reward')
  @ApiBody({ type: RequestCreateConversionReward })
  async createConversionReward(@Body() body: RequestCreateConversionReward) {
    return this.withdrawService.createConversionReward(body);
  }
}
