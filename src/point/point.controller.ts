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
import { CloseQuestDto, CreateQuestDto } from './dto/create-quest.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
@Controller('point')
export class PointController {
  constructor(
    private readonly pointService: PointService,
    private readonly tasksService: TasksService,
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

  @Get('save-points')
  savePoint() {
    return this.tasksService.handleCron();
  }

  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'banner_en', maxCount: 1 },
      { name: 'banner_th', maxCount: 1 },
      { name: 'sub_banner_en', maxCount: 1 },
      { name: 'sub_banner_th', maxCount: 1 },
    ]),
  )
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('create-quest')
  @ApiBody({ type: CreateQuestDto })
  createQuest(
    @Body() createQuestDto: CreateQuestDto,
    @UploadedFiles()
    files: {
      banner_en?: Express.Multer.File[];
      banner_th?: Express.Multer.File[];
      sub_banner_en?: Express.Multer.File[];
      sub_banner_th?: Express.Multer.File[];
    },
  ) {
    return this.pointService.createQuest(createQuestDto, files);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Patch('close-quest')
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

  @Get('get-quest-open')
  getQuestOpen() {
    return this.pointService.getQuestOpen();
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
}
