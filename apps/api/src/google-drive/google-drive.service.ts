import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateGoogleDriveDto,
  FileGoogleDriveDto,
} from './dto/create-google-drive.dto';
import { UpdateGoogleDriveDto } from './dto/update-google-drive.dto';
import { google } from 'googleapis';
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
@Injectable()
export class GoogleDriveService {
  private driveClient;
  private folderId = '1IEy_ICq0l2oxYHyS-E2jSxUVJOK79zH1'; // Replace with your folder ID

  constructor() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.driveClient = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  private assertGoogleDriveConfigured(): void {
    const missing = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REFRESH_TOKEN',
    ].filter((key) => !process.env[key]?.trim());
    if (missing.length === 0) return;
    throw new HttpException(
      `Google Drive is not configured (missing: ${missing.join(', ')}). Brand/category/quest image uploads require GOOGLE_* credentials in the API environment.`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  private async resolveUploadBuffer(
    file: Express.Multer.File,
  ): Promise<Buffer> {
    if (file.buffer?.length) {
      return file.buffer;
    }
    if (file.path) {
      const fromDisk = await readFile(file.path);
      if (fromDisk.length > 0) {
        return fromDisk;
      }
    }
    throw new Error('Upload file is empty: no buffer or readable path');
  }

  async uploadFile(
    file: Express.Multer.File,
    folderId?: string,
  ): Promise<FileGoogleDriveDto> {
    this.assertGoogleDriveConfigured();
    try {
      const buffer = await this.resolveUploadBuffer(file);
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);

      const response = await this.driveClient.files.create({
        requestBody: {
          name: file.originalname,
          parents: [folderId || this.folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      // console.log('File uploaded to Google Drive with ID:', response.data);
      const fileId = response.data.id;

      // 2) Set file permission to "public"
      await this.driveClient.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: false,
        },
      });
      // 3) Generate public URL for web
      const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      return { ...response.data, publicUrl };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string) {
    try {
      await this.driveClient.files.delete({
        fileId,
      });
      console.log(`File with ID: ${fileId} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      return error;
    }
  }
  // Get file stream from Drive
  async getFileStream(fileId: string) {
    return this.driveClient.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
  }
  create(createGoogleDriveDto: CreateGoogleDriveDto) {
    console.log(createGoogleDriveDto);
    return 'This action adds a new googleDrive';
  }

  findAll() {
    return `This action returns all googleDrive`;
  }

  findOne(id: number) {
    return `This action returns a #${id} googleDrive`;
  }

  update(id: number, updateGoogleDriveDto: UpdateGoogleDriveDto) {
    console.log(updateGoogleDriveDto);
    return `This action updates a #${id} googleDrive`;
  }

  remove(id: number) {
    return `This action removes a #${id} googleDrive`;
  }
}
