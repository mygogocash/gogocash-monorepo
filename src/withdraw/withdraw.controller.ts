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
import { WithdrawService } from './withdraw.service';
import {
  CreateWithdrawDto,
  GETSignDTO,
  GetWithdrawTransactionsDTO,
} from './dto/create-withdraw.dto';
import {
  CreateWithdrawMethod,
  UpdateWithdrawDto,
} from './dto/update-withdraw.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: GETSignDTO })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('signature')
  getSign(@Body() createWithdrawDto: GETSignDTO) {
    return this.withdrawService.getSign(createWithdrawDto);
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

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('list-check')
  listCheckWithdraw(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.listCheckWithdraw(id);
  }

  @Post('list-check-admin/:userId')
  listCheckWithdrawAdmin(@Req() req: Request, @Param('userId') userId: string) {
    return this.withdrawService.listCheckWithdraw(userId);
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
  create(@Req() req: Request, @Body() createWithdrawDto: CreateWithdrawDto) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.create(createWithdrawDto, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawMethod })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('bank-transfer')
  createBankTransfer(
    @Req() req: Request,
    @Body() createWithdrawDto: CreateWithdrawMethod,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.withdrawService.createBankTransfer(createWithdrawDto, id);
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
  getMethodId(@Param('id') id: string) {
    return this.withdrawService.getMethodId(id);
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
  deleteMethodData(@Param('id') id: string) {
    return this.withdrawService.deleteMethodData(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: CreateWithdrawMethod })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Patch('methods/:id')
  updateMethodData(
    @Param('id') id: string,
    @Body() body: CreateWithdrawMethod,
  ) {
    return this.withdrawService.updateMethodData(id, body);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.withdrawService.findOne(+id);
  // }
}
