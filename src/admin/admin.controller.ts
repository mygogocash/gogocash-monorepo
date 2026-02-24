/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  CreateAdminDto,
  LoginAdminDto,
  RegisterAdminDto,
} from './dto/create-admin.dto';
import {
  UpdateAdminDto,
  UpdateBannerHomeDto,
  UpdateFeeRateDto,
  UpdateOfferAdminDto,
  UpdateRequestWithdrawDto,
  UpdateUserDto,
} from './dto/update-admin.dto';
import { UserAdminService } from './user-admin/user-admin-service';
import { ApiBearerAuth, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { AuthAdminGuard } from './jwt-auth-admin.guard';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userAdminService: UserAdminService,
  ) {}

  @ApiBody({ type: LoginAdminDto })
  @Post('login')
  login(@Body() createAdminDto: LoginAdminDto) {
    return this.userAdminService.login(createAdminDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @ApiBody({ type: RegisterAdminDto })
  @Post('register')
  register(@Body() createAdminDto: RegisterAdminDto) {
    return this.userAdminService.register(createAdminDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  // @ApiHeader({
  //   name: 'Authorization',
  //   description: 'Bearer token',
  //   required: true,
  //   schema: {
  //     type: 'string',
  //     example: 'Bearer eyJhb',
  //   },
  // })
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('withdraw-all')
  withdrawAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
  ) {
    // return this.adminService.findAll(page, limit, search);
    return this.adminService.getWithdrawAll(page, limit, search);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('conversion-all')
  getConversionAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('key') key?: string,
  ) {
    return this.adminService.getConversionAll(Number(page), Number(limit), search, key, status);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Post('getConversionInWithdraw')
  getConversionInWithdraw(@Body() body: { data: number[] }) {
    return this.adminService.getConversionInWithdraw(body.data);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('get-fee-rate')
  getFeeRate() {
    return this.adminService.getFeeRate();
  }

  @UseGuards(AuthAdminGuard)
  @ApiBody({ type: UpdateFeeRateDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Patch('update-fee-rate/:id')
  updateFeeRate(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateFeeRateDto,
  ) {
    return this.adminService.updateFeeRate(updateAdminDto, id);
  }
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.adminService.findOne(id);
  // }
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Patch('update-request-withdraw')
  updateRequestWithdraw(
    @UploadedFile() file: Express.Multer.File,
    @Body() updateAdminDto: UpdateRequestWithdrawDto,
  ) {
    return this.adminService.updateRequestWithdraw(updateAdminDto, file);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get()
  findAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAll(page, limit, search);
  }

  // @UseInterceptors(
  //   FileInterceptor('logo_desktop'),
  //   // FileInterceptor('logo_mobile'),
  // )
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo_desktop', maxCount: 1 },
      { name: 'logo_mobile', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo_circle', maxCount: 1 },
      { name: 'banner_mobile', maxCount: 1 },
    ]),
  )
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Patch('update-offer/:id')
  updateOffer(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateOfferAdminDto,
    @UploadedFiles() files: { banner_mobile?: Express.Multer.File[], logo_desktop?: Express.Multer.File[], logo_mobile?: Express.Multer.File[], banner?: Express.Multer.File[], logo_circle?: Express.Multer.File[] }
  ) {
    return this.adminService.updateOffer(id, {
      logo_desktop: files?.logo_desktop ? files?.logo_desktop?.[0] : null,
      logo_mobile: files?.logo_mobile ? files?.logo_mobile?.[0] : null,
      banner: files?.banner ? files?.banner?.[0] : null,
      banner_mobile: files?.banner_mobile ? files?.banner_mobile?.[0] : null,
      logo_circle: files?.logo_circle ? files?.logo_circle?.[0] : null,
      offer_name_display: updateAdminDto.offer_name_display,
      disabled: updateAdminDto?.disabled?.toString() == "true" ? true : false,
      commission_store: updateAdminDto.commission_store && updateAdminDto.commission_store.toString() !== "undefined" ? updateAdminDto.commission_store : null,
      max_cap: updateAdminDto.max_cap && updateAdminDto.max_cap.toString() !== "undefined" ? updateAdminDto.max_cap : null,
      extra_store: updateAdminDto.extra_store === "true" ? true : false,
    });
  }


  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
    ]),
  )
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Patch('update-category/:id')
  updateCategory(
    @Param('id') id: string,
    @UploadedFiles() files: { image?: Express.Multer.File[] }
  ) {
    return this.adminService.updateCategory(id, {
      image: files?.image ? files?.image?.[0] : null,
    });
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiBody({ type: UpdateUserDto })
  @Post('update-user/:id')
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, updateUserDto?.mobile);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiBody({ type: UpdateUserDto })
  @Get('get-mycashback-user/:id')
  viewMyCahsback(
    @Param('id') id: string,
  ) {
    return this.adminService.getMyCashBackUser(id);
  }

  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_1', maxCount: 1 },
      { name: 'image_2', maxCount: 1 },
      { name: 'image_3', maxCount: 1 },
      { name: 'image_4', maxCount: 1 },
      { name: 'image_5', maxCount: 1 },
    ]),
  )
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiBody({ type: UpdateBannerHomeDto })
  @Post('banner-home')
  updateBannerHome(
    @UploadedFiles() files: { image_1?: Express.Multer.File[], image_2?: Express.Multer.File[], image_3?: Express.Multer.File[], image_4?: Express.Multer.File[], image_5 ?: Express.Multer.File[] },
    @Body() body: UpdateBannerHomeDto,
  ) {
    const filesDto: UpdateBannerHomeDto = {
      image_1: files?.image_1 ? files?.image_1?.[0] as any : null,
      image_2: files?.image_2 ? files?.image_2?.[0] as any : null,
      image_3: files?.image_3 ? files?.image_3?.[0] as any : null,
      image_4: files?.image_4 ? files?.image_4?.[0] as any : null,
      image_5: files?.image_5 ? files?.image_5?.[0] as any : null,
      link_1: body.link_1 ? body.link_1 : null,
      link_2: body.link_2 ? body.link_2 : null,
      link_3: body.link_3 ? body.link_3 : null,
      link_4: body.link_4 ? body.link_4 : null,
      link_5: body.link_5 ? body.link_5 : null,
    };
    return this.adminService.updateBannerHome(filesDto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('banner-home')
  getBannerHome() {
    return this.adminService.getBannerHome();
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Patch('update-conversion/:id')
  updateConversionDataByConversionId(@Param('id') id: string) {
    // console.log('Updating conversion data for ID:', id);
    return this.adminService.updateConversionDataByConversionId(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth()
  @Get('get-deep-link-list')
  getDeepLinkList() {
    // console.log('Updating conversion data for ID:', id);
    return this.adminService.getDeepLinkList();
  }
}
