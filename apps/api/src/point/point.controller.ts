import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { PointService } from './point.service';
import { CreatePointDto } from './dto/create-point.dto';
import { ApiBearerAuth, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { TasksService } from './tasksService';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import {
  CloseQuestDto,
  CreateQuestRevisionDto,
  CreateQuestDto,
  PublishQuestRevisionDto,
  QuestMediaQaCleanupDto,
  UpdateQuestCampaignDto,
  UpdateQuestRewardsDto,
  UpdateQuestTasksDto,
} from './dto/create-quest.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/admin/roles.guard';
import { Roles } from 'src/admin/roles.decorator';
import { QuestMediaQaService } from './quest-media-qa.service';
import { QuestTaskCatalogService } from './quest-task-catalog.service';
import { QuestRevisionService } from './quest-revision.service';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { QuestBannerFiles } from './quest-media.validation';

const QUEST_BANNER_UPLOAD_FIELDS = [
  { name: 'banner_en', maxCount: 1 },
  { name: 'banner_th', maxCount: 1 },
  { name: 'sub_banner_en', maxCount: 1 },
  { name: 'sub_banner_th', maxCount: 1 },
];

@Controller('point')
export class PointController {
  constructor(
    private readonly pointService: PointService,
    private readonly tasksService: TasksService,
    private readonly questMediaQa: QuestMediaQaService,
    private readonly questTaskCatalog: QuestTaskCatalogService,
    private readonly questRevision: QuestRevisionService,
  ) {}

  @Post()
  create(@Body() createPointDto: CreatePointDto) {
    return this.pointService.create(createPointDto);
  }
  findAll() {
    return this.pointService.findAll();
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get()
  findOne(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.pointService.getPoint(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('referral-list')
  getListReferral(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.pointService.getListReferral(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePointDto: UpdatePointDto) {
  //   return this.pointService.update(+id, updatePointDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.pointService.remove(+id);
  // }

  @Get('quest-list/:startDate/:endDate')
  getQuestRankList(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.pointService.getQuestRankList(startDate, endDate);
    // return this.pointService.getQuestRankListOfPoint(startDate, endDate);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('my-quest-list/:startDate/:endDate')
  getMyQuestRank(
    @Req() req: Request,
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    // return this.pointService.getMyQuestRankList(id);
    return this.pointService.getMyQuestRankListOfPoint(id, startDate, endDate);
  }

  @Get('check-points/:startDate/:endDate')
  addPoint(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    // return this.tasksService.handleCron();
    return this.pointService.getQuestRankListOfPoint(startDate, endDate);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Get('save-points')
  savePoint() {
    return this.tasksService.handleCron();
  }

  @UseInterceptors(FileFieldsInterceptor(QUEST_BANNER_UPLOAD_FIELDS))
  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('create-quest')
  @Roles('superadmin')
  @ApiBody({ type: CreateQuestDto })
  createQuest(
    @Body() createQuestDto: CreateQuestDto,
    @UploadedFiles()
    files: QuestBannerFiles,
  ) {
    return this.pointService.createQuest(createQuestDto, files);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Get('admin-quest-media/readiness')
  getQuestMediaReadiness() {
    return this.questMediaQa.readiness();
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Get('admin-quest-media/qa-status/:requestKey')
  getQuestMediaQaStatus(@Param('requestKey') requestKey: string) {
    return this.questMediaQa.status(requestKey);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Post('admin-quest-media/qa-cleanup')
  @ApiBody({ type: QuestMediaQaCleanupDto })
  cleanupQuestMediaAcceptance(@Body() input: QuestMediaQaCleanupDto) {
    return this.questMediaQa.cleanupAcceptance(input);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Patch('close-quest')
  @Roles('superadmin')
  @ApiBody({ type: CloseQuestDto })
  closeQuest(@Body() closeQuestDto: CloseQuestDto) {
    return this.pointService.closeQuest(closeQuestDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('admin-get-quest')
  getAdminQuestOpen() {
    return this.pointService.getQuestAdmin();
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('admin-quest-capabilities')
  getQuestManagementCapabilities() {
    return this.pointService.getQuestManagementCapabilities();
  }

  @UseInterceptors(FileFieldsInterceptor(QUEST_BANNER_UPLOAD_FIELDS))
  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Patch('admin-quest/:id/campaign')
  @ApiBody({ type: UpdateQuestCampaignDto })
  updateQuestCampaign(
    @Param('id') id: string,
    @Body() updateQuestCampaignDto: UpdateQuestCampaignDto,
    @UploadedFiles() files: QuestBannerFiles,
  ) {
    return this.pointService.updateQuestCampaign(
      id,
      updateQuestCampaignDto,
      files,
    );
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Patch('admin-quest/:id/tasks')
  @ApiBody({ type: UpdateQuestTasksDto })
  updateQuestTasks(
    @Param('id') id: string,
    @Body() updateQuestTasksDto: UpdateQuestTasksDto,
  ) {
    return this.pointService.updateQuestTasks(id, updateQuestTasksDto);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Patch('admin-quest/:id/rewards')
  @ApiBody({ type: UpdateQuestRewardsDto })
  updateQuestRewards(
    @Param('id') id: string,
    @Body() updateQuestRewardsDto: UpdateQuestRewardsDto,
  ) {
    return this.pointService.updateQuestRewards(id, updateQuestRewardsDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('admin-quest/:id/leaderboard')
  getQuestAdminLeaderboard(@Param('id') id: string) {
    return this.pointService.getQuestAdminLeaderboard(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('admin-quest/:id/effective-tasks')
  getQuestAdminEffectiveTasks(@Param('id') id: string) {
    return this.questTaskCatalog.getAdminCatalog(id);
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Post('admin-quest/:id/revisions')
  createQuestRevision(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() input: CreateQuestRevisionDto,
  ) {
    return this.questRevision.createRevision(
      id,
      input,
      String((req['user'] as any)?.sub ?? ''),
    );
  }

  @UseGuards(AuthAdminGuard, RolesGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Roles('superadmin')
  @Post('admin-quest/:id/publish')
  publishQuestRevision(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() input: PublishQuestRevisionDto,
  ) {
    return this.questRevision.publishRevision(
      id,
      input,
      String((req['user'] as any)?.sub ?? ''),
    );
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('admin-quest/:id/task-deeplinks')
  getQuestTaskDeeplinkSummary(@Param('id') id: string) {
    return this.pointService.getQuestTaskDeeplinkSummary(id);
  }

  @Get('get-quest-open')
  getQuestOpen() {
    return this.pointService.getQuestOpen();
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 60 })
  @Get('quest-task-catalog')
  getQuestTaskCatalog() {
    return this.questTaskCatalog.getPublicCatalog();
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('get-quest-social')
  getQuestSocial(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.pointService.getQuestSocial(id);
  }

  @Get('get-quest-all')
  getQuestAll() {
    return this.pointService.getQuestAll();
  }

  // Admin/internal round aggregation — returns user PII (email, aff_sub*);
  // must not be reachable unauthenticated.
  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @Get('get-quest-all/:startDate/:endDate')
  getQuestEndToRound(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.pointService.getQuestEndTRound(startDate, endDate);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Patch('quest-social/:type/:action')
  questSocial(
    @Req() req: Request,
    @Param('type') type: string,
    @Param('action') action: string,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.pointService.questSocial(id, type, action);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Patch('update-quest-social/:id')
  updateQuestSocial(@Req() req: Request, @Param('id') id: string) {
    const user = req['user'] as any;
    const userId = user?.sub;
    return this.pointService.updateQuestSocial(userId, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('get-my-point-sum-all-month')
  getMyPointSumAllMonth(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.pointService.getMyPointSumEveryMonth(id);
  }

  // Admin/internal special-point round calculation — returns user PII
  // (email); must not be reachable unauthenticated.
  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @Get('get-spacial-point-next-round/:startDate/:endDate')
  getSpacialPointNextRound(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.pointService.getSpacialPointNextRound(startDate, endDate);
  }
}
