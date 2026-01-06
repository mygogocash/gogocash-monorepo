import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Put,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateCountryDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Types } from 'mongoose';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @UseGuards(FirebaseAuthGuard)
  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //   return this.userService.createFromCrossmint(createUserDto);
  // }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Put('update-country')
  updateCountry(
    @Body() updateCountryDto: UpdateCountryDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.userService.updateCountry(updateCountryDto, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('profile')
  findOne(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.userService.findOne({ _id: new Types.ObjectId(id) });
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Put('profile')
  async updateProfile(
    @Req() req: Request,
    @Body() updateUserDto: { data: UpdateUserDto },
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    const userData = await this.userService.findOne({
      _id: new Types.ObjectId(id),
    });
    return this.userService.update(userData._id, updateUserDto.data);
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
    return this.userService.findAll(page, limit, search);
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(new Types.ObjectId(id), updateUserDto);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('balance/me/mycashback')
  balanceMyCashback(@Req() req: Request) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.userService.getBalanceMyCashback(id);
  }

  @Get('balance/me/mycashback/admin/:id')
  balanceMyCashbackAdmin(@Param('id') id: string) {
    return this.userService.getBalanceMyCashback(id);
  }
}
