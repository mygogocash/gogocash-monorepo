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
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { CrossmintAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @UseGuards(CrossmintAuthGuard)
  @ApiBody({ type: GETSignDTO })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('signature')
  getSign(@Body() createWithdrawDto: GETSignDTO) {
    return this.withdrawService.getSign(createWithdrawDto);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('check')
  checkWithdraw(@Req() req: Request) {
    const user = req['user'] as any;
    const id_crossmint = user?.sub;
    return this.withdrawService.checkWithdraw(id_crossmint);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiBody({ type: GETSignDTO })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post()
  create(@Req() req: Request, @Body() createWithdrawDto: CreateWithdrawDto) {
    const user = req['user'] as any;
    const id_crossmint = user?.sub;
    return this.withdrawService.create(createWithdrawDto, id_crossmint);
  }

  @UseGuards(CrossmintAuthGuard)
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
    const id_crossmint = user?.sub;
    return this.withdrawService.findAll(params, id_crossmint);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.withdrawService.findOne(+id);
  }

  @UseGuards(CrossmintAuthGuard)
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.withdrawService.remove(+id);
  }
}
