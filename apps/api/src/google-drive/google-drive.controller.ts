import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { CreateGoogleDriveDto } from './dto/create-google-drive.dto';
import { UpdateGoogleDriveDto } from './dto/update-google-drive.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
@Controller('google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId: string,
  ) {
    const result = await this.googleDriveService.uploadFile(file, folderId);
    return {
      message: 'File uploaded successfully',
      file: result,
    };
  }

  // Serve image via backend proxy
  @Get('file/:id')
  async getFile(@Param('id') fileId: string, @Res() res: Response) {
    const driveRes = await this.googleDriveService.getFileStream(fileId);

    // detect MIME type จากชื่อไฟล์
    res.setHeader('Content-Type', 'image/png'); // หรือปรับตามจริง

    driveRes.data.pipe(res);
  }

  @Post()
  create(@Body() createGoogleDriveDto: CreateGoogleDriveDto) {
    return this.googleDriveService.create(createGoogleDriveDto);
  }

  @Get()
  findAll() {
    return this.googleDriveService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.googleDriveService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGoogleDriveDto: UpdateGoogleDriveDto,
  ) {
    return this.googleDriveService.update(+id, updateGoogleDriveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.googleDriveService.remove(+id);
  }
}
