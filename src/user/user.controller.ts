import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Put,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateCountryDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Types } from 'mongoose';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { CrossmintAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(CrossmintAuthGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Put('update-country')
  updateCountry(
    @Body() updateCountryDto: UpdateCountryDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id_crossmint = user?.sub;
    return this.userService.updateCountry(updateCountryDto, id_crossmint);
  }

  @UseGuards(CrossmintAuthGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @Get('profile')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findOne(@Req() req: Request) {
    const user = req['user'] as any;
    const id_crossmint = user?.sub;
    return this.userService.findOne({ id_crossmint });
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

  @UseGuards(CrossmintAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(new Types.ObjectId(id), updateUserDto);
  }
}
