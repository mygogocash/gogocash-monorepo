import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Types } from 'mongoose';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
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

  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findOne(@Param('id') id: string) {
    // return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(new Types.ObjectId(id), updateUserDto);
  }
}
