export class CreateGoogleDriveDto {}

export interface ResCreateGoogleDriveDto {
  message: string;
  file: FileGoogleDriveDto;
}

export interface FileGoogleDriveDto {
  id: string;
  name: string;
  webContentLink: string;
  webViewLink: string;
  publicUrl: string;
}
