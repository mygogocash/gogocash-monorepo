import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import {
  GetMissingOrderDto,
  GetMyOfferDto,
  SaveMissingOrderDto,
} from './dto/create-offer.dto';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { UpdateCouponDto } from './dto/update-offer.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
@Controller('offer')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Get('extra-point')
  getOfferExtraPoint() {
    return this.offerService.getOfferExtraPoint();
  }

  @Get('banner-home')
  getBannerHome() {
    return this.offerService.getBannerHome();
  }

  @Get('top-brands')
  getTopBrands() {
    // Public home "top brands" — admin-curated via PUT /admin/top-brands.
    return this.offerService.getDisplayTopBrands();
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('get-coupon')
  async getCoupon(
    @Req() request: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
  ) {
    // const user = request['user'] as any;
    // const id = user?.sub;
    return this.offerService.getCoupon(page, limit, search);
  }

  @Get('get-coupon-id/:offerId')
  async getCouponId(
    @Req() request: Request,
    @Param('offerId') offerId: string,
  ) {
    // const user = request['user'] as any;
    // const id = user?.sub;
    return this.offerService.getCouponId(offerId);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: UpdateCouponDto })
  @Post('update-coupon')
  async updateCoupon(@Req() request: Request, @Body() body: UpdateCouponDto) {
    // const user = request.user as any;
    // console.log('user', request);
    // const id = user.sub;
    return this.offerService.updateCoupon(body);
  }

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
  @ApiQuery({
    name: 'country',
    required: false,
    type: String,
    description: 'Country offer',
  })
  findAll(@Req() request: Request) {
    const page = request.query.page ? Number(request.query.page) : 1;
    const limit = request.query.limit ? Number(request.query.limit) : 10;
    const search = request.query.search ? request.query.search?.toString() : '';
    const country = request.query.country
      ? request.query.country?.toString()
      : '';
    const category = request.query.category
      ? request.query.category?.toString()
      : '';

    return this.offerService.findAll(page, limit, search, category, country);
  }

  @Get('extra')
  findAllExtra() {
    return this.offerService.findAllExtra();
  }

  @Get('admin')
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
  @ApiQuery({
    name: 'country',
    required: false,
    type: String,
    description: 'Country offer',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_review', 'approved', 'rejected'],
    description: 'Admin-only curation status filter.',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['involve', 'optimise', 'manual'],
    description: 'Admin-only affiliate network filter.',
  })
  findAllAdmin(@Req() request: Request) {
    const page = request.query.page ? Number(request.query.page) : 1;
    const limit = request.query.limit ? Number(request.query.limit) : 10;
    const search = request.query.search ? request.query.search?.toString() : '';
    const category = request.query.category
      ? request.query.category?.toString()
      : '';
    const country = request.query.country
      ? request.query.country?.toString()
      : '';
    const status = request.query.status
      ? request.query.status?.toString()
      : undefined;
    const source = request.query.source
      ? request.query.source?.toString()
      : undefined;

    return this.offerService.findAll(
      page,
      limit,
      search,
      category,
      country,
      true,
      { status, source },
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offerService.findOne(id);
  }

  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search Category name',
  })
  @Get('get-category/list')
  getCategoryList(@Req() request: Request) {
    const search = request.query.search ? request.query.search?.toString() : '';
    return this.offerService.getCategoryList(search);
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
  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('my-offers')
  myOffers(@Req() request: any, @Body() body: GetMyOfferDto) {
    const user = request.user as any;
    const id = user.sub;
    return this.offerService.findMyOffer(id, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('write-json')
  async writeJJsonToFile() {
    const allOffers = await this.offerService.findAll(1, 1000, '', '');
    return this.offerService.writeJJsonToFile(allOffers.data);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('favorite/:offerId')
  async favoriteOffer(@Req() request: any, @Param('offerId') offerId: string) {
    const user = request.user as any;
    const id = user.sub;
    return this.offerService.favoriteOfferByUser(id, offerId);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('favorite/:page/:limit')
  async getFavoriteOffer(
    @Req() request: any,
    @Param('page') page: number,
    @Param('limit') limit: number,
  ) {
    const user = request.user as any;
    const id = user.sub;
    return this.offerService.getFavoriteOfferByUser(id, page, limit);
  }

  @UseInterceptors(FilesInterceptor('documents', 10))
  @UseGuards(FirebaseAuthGuard, RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 10 })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('saveMissingOrder')
  async saveMissingOrder(
    @Req() request: any,
    @Body() body: SaveMissingOrderDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const user = request.user as any;
    const id = user.sub;
    return this.offerService.saveMissingOrder(id, body, files);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('missing-order')
  @ApiBody({ type: GetMissingOrderDto })
  async getMissingOrder(@Req() request: any, @Body() body: GetMissingOrderDto) {
    const user = request.user as any;
    const id = user.sub;
    const { page, limit, search } = body;
    return this.offerService.getMissingOrder(page, limit, search, id);
  }
}
