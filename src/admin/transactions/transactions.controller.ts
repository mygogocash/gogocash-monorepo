import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { TransactionsService } from './transactions.service';
import { TransactionQueryDto, FlagTransactionDto } from './dto/transaction-query.dto';

@ApiTags('Admin Transactions')
@Controller('admin/transactions')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('export')
  async exportCsv(
    @Query() query: TransactionQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.transactionsService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.csv',
    );
    res.send(csv);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Roles('approver')
  @Put(':id/flag')
  flagTransaction(
    @Param('id') id: string,
    @Body() dto: FlagTransactionDto,
  ) {
    return this.transactionsService.flagTransaction(
      id,
      dto.type,
      dto.flagged,
      dto.reason,
    );
  }
}
