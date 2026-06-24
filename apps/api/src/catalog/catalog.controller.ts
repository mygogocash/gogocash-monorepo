import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';
import { RolesGuard } from '../admin/roles.guard';
import { Roles } from '../admin/roles.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CatalogMediaService } from './media.service';
import { CatalogService } from './catalog.service';
import { CommerceService } from './commerce.service';
import {
  CreateCatalogBannerDto,
  CreateCatalogProductDto,
  CreateCheckoutSessionDto,
  CreateMediaUploadDto,
  ListCatalogDto,
  UpdateCatalogBannerDto,
  UpdateCatalogProductDto,
  UpdateOrderStatusDto,
  UpdateShopDto,
  UpsertCartItemDto,
} from './dto/catalog.dto';

type RequestUser = { userId?: string; uid?: string; sub?: string; email?: string };

function requestUserId(req: { user?: RequestUser }) {
  return req.user?.userId || req.user?.uid || req.user?.sub;
}

function requestActor(req: { user?: RequestUser }) {
  return { userId: requestUserId(req), email: req.user?.email };
}

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('home')
  getHome(@Query() query: ListCatalogDto) {
    return this.catalogService.getHome(query);
  }

  @Get('shops')
  getShops(@Query() query: ListCatalogDto) {
    return this.catalogService.listPublishedShops(query);
  }

  @Get('products')
  getProducts(@Query() query: ListCatalogDto) {
    return this.catalogService.listPublishedProducts(query);
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.catalogService.getPublishedProduct(slug);
  }
}

@ApiTags('Admin Catalog')
@Controller('admin/catalog')
@UseGuards(AuthAdminGuard, RolesGuard)
@Roles('support')
@ApiBearerAuth()
@ApiSecurity('access-token')
export class AdminCatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly mediaService: CatalogMediaService,
  ) {}

  @Get('banners')
  listBanners(@Query() query: ListCatalogDto) {
    return this.catalogService.listAdminBanners(query);
  }

  @Post('banners')
  createBanner(@Body() dto: CreateCatalogBannerDto, @Req() req: { user?: RequestUser }) {
    return this.catalogService.createBanner(dto, requestActor(req));
  }

  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: UpdateCatalogBannerDto, @Req() req: { user?: RequestUser }) {
    return this.catalogService.updateBanner(id, dto, requestActor(req));
  }

  @Delete('banners/:id')
  archiveBanner(@Param('id') id: string, @Req() req: { user?: RequestUser }) {
    return this.catalogService.archiveBanner(id, requestActor(req));
  }

  @Get('brands')
  listBrands(@Query() query: ListCatalogDto) {
    return this.catalogService.listAdminBrands(query);
  }

  @Get('shops')
  listShops(@Query() query: ListCatalogDto) {
    return this.catalogService.listAdminShops(query);
  }

  @Put('shops/:brandId')
  updateShop(@Param('brandId') brandId: string, @Body() dto: UpdateShopDto, @Req() req: { user?: RequestUser }) {
    return this.catalogService.updateShop(brandId, dto, requestActor(req));
  }

  @Get('products')
  listProducts(@Query() query: ListCatalogDto) {
    return this.catalogService.listAdminProducts(query);
  }

  @Post('products')
  createProduct(@Body() dto: CreateCatalogProductDto, @Req() req: { user?: RequestUser }) {
    return this.catalogService.createProduct(dto, requestActor(req));
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateCatalogProductDto, @Req() req: { user?: RequestUser }) {
    return this.catalogService.updateProduct(id, dto, requestActor(req));
  }

  @Delete('products/:id')
  archiveProduct(@Param('id') id: string, @Req() req: { user?: RequestUser }) {
    return this.catalogService.archiveProduct(id, requestActor(req));
  }

  @Post('media/uploads')
  createMediaUpload(@Body() dto: CreateMediaUploadDto) {
    return this.mediaService.createSignedUpload(dto);
  }
}

@ApiTags('Commerce')
@Controller('commerce')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('cart')
  getCart(@Req() req: { user?: RequestUser }) {
    return this.commerceService.getCart(requestUserId(req) || '');
  }

  @Put('cart/items')
  upsertCartItem(@Req() req: { user?: RequestUser }, @Body() dto: UpsertCartItemDto) {
    return this.commerceService.upsertCartItem(requestUserId(req) || '', dto);
  }

  @Post('cart/items')
  postCartItem(@Req() req: { user?: RequestUser }, @Body() dto: UpsertCartItemDto) {
    return this.commerceService.upsertCartItem(requestUserId(req) || '', dto);
  }

  @Delete('cart/items/:productId/:variantSku')
  removeCartItem(@Req() req: { user?: RequestUser }, @Param('productId') productId: string, @Param('variantSku') variantSku: string) {
    return this.commerceService.removeCartItem(requestUserId(req) || '', productId, variantSku);
  }

  @Post('checkout/session')
  createCheckoutSession(
    @Req() req: { user?: RequestUser },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.commerceService.createCheckoutSession(requestUserId(req) || '', dto, idempotencyKey || dto.idempotency_key);
  }

  @Get('orders')
  listOrders(@Req() req: { user?: RequestUser }) {
    return this.commerceService.listCustomerOrders(requestUserId(req) || '');
  }
}

@ApiTags('Admin Commerce')
@Controller('admin/commerce')
@UseGuards(AuthAdminGuard, RolesGuard)
@Roles('support')
@ApiBearerAuth()
@ApiSecurity('access-token')
export class AdminCommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('orders')
  listOrders(@Query() query: { status?: string; limit?: number }) {
    return this.commerceService.listAdminOrders(query);
  }

  @Put('orders/:id/status')
  @Roles('approver')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.commerceService.updateOrderStatus(id, dto);
  }
}

@ApiTags('Commerce Payments')
@Controller('commerce/payments')
export class CommercePaymentsController {
  constructor(private readonly commerceService: CommerceService) {}

  @Post('stripe/webhook')
  handleStripeWebhook(@Req() req: { rawBody?: Buffer; body?: unknown }, @Headers('stripe-signature') signature?: string) {
    return this.commerceService.handleWebhook(req.rawBody || req.body, signature);
  }
}
