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
import { InvolveService } from './involve.service';
import {
  CreateAffiliateDto,
  RequestGetConversion,
} from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { CrossmintAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Involve')
@Controller('involve')
export class InvolveController {
  constructor(private readonly involveService: InvolveService) {}

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Get()
  findAll() {
    return this.involveService.findAll();
  }

  @Get('checkOfferDuplicate')
  checkOfferDuplicate() {
    return this.involveService.checkOfferDuplicate();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvolveDto: UpdateInvolveDto) {
    return this.involveService.update(+id, updateInvolveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.involveService.remove(+id);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiBody({ type: CreateAffiliateDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Post('create-affiliate')
  createAffiliate(
    @Body() createInvolveDto: CreateAffiliateDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id_crossmint = user?.sub;
    return this.involveService.createAffiliate(createInvolveDto, id_crossmint);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiBody({ type: RequestGetConversion })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Post('conversion/:offer_id')
  async getConversion(
    @Param('offer_id') offer_id: string,
    @Body() body: RequestGetConversion,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id_crossmint = user?.sub;
    return this.involveService.getConversion(offer_id, body, id_crossmint);
  }
}
