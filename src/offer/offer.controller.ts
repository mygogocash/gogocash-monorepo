import { Controller, Get, Param, Req } from '@nestjs/common';
import { OfferService } from './offer.service';
import { ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
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
    console.log('id', id);
    return this.offerService.findOne(id);
  }
}
