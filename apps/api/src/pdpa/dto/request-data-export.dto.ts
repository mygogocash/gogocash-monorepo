import { IsIn, IsOptional } from 'class-validator';

export class RequestDataExportDto {
  @IsOptional()
  @IsIn(['en', 'th'])
  locale?: 'en' | 'th';
}
