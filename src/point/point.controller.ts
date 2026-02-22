import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PointService } from './point.service';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { TasksService } from './tasksService';
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePointDto: UpdatePointDto) {
    return this.pointService.update(+id, updatePointDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pointService.remove(+id);
  }

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
}
