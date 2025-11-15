import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { ApiBearerAuth, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { CrossmintAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetMyOfferDto } from './dto/create-offer.dto';
@Controller('offer')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search offer name',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Category offer',
  })
  findAll(@Req() request: Request) {
    const page = request.query.page ? Number(request.query.page) : 1;
    const limit = request.query.limit ? Number(request.query.limit) : 10;
    const search = request.query.search ? request.query.search?.toString() : '';
    const category = request.query.category
      ? request.query.category?.toString()
      : '';

    return this.offerService.findAll(page, limit, search, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offerService.findOne(id);
  }

  @Get('get-category/list')
  getCategoryList() {
    return this.offerService.getCategoryList();
  }

  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @UseGuards(CrossmintAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('my-offers')
  myOffers(@Req() request: Request, @Body() body: GetMyOfferDto) {
    const user = request.user as any;
    const id = user.sub;
    return this.offerService.findMyOffer(id, body);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('write-json')
  async writeJJsonToFile() {
    const allOffers = await this.offerService.findAll(1, 1000, '', '');
    return this.offerService.writeJJsonToFile(allOffers.data);
  }
}
