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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  CreateAdminDto,
  LoginAdminDto,
  RegisterAdminDto,
} from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UserAdminService } from './user-admin/user-admin-service';
import { ApiBearerAuth, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { AuthAdminGuard } from './jwt-auth-admin.guard';

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
  ) {
    return this.adminService.getConversionAll(page, limit, search, status);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.adminService.findOne(id);
  // }

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
}
