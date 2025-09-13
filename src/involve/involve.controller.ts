import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InvolveService } from './involve.service';
import { CreateInvolveDto } from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';

@Controller('involve')
export class InvolveController {
  constructor(private readonly involveService: InvolveService) {}

  @Post()
  create(@Body() createInvolveDto: CreateInvolveDto) {
    return this.involveService.create(createInvolveDto);
  }

  @Get()
  findAll() {
    return this.involveService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.involveService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvolveDto: UpdateInvolveDto) {
    return this.involveService.update(+id, updateInvolveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.involveService.remove(+id);
  }
}
