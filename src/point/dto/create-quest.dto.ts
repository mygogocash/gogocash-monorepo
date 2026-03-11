import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestDto {
  @ApiProperty({ example: '' })
  _id?: string;
  @ApiProperty({ example: '2024-01-01' })
  start_date: Date;
  @ApiProperty({ example: '2024-01-31' })
  end_date: Date;
  @ApiProperty({ example: 'open|close' })
  status: string;

  @ApiProperty({ example: '' })
  facebook_post: string;
  @ApiProperty({ example: '' })
  facebook_page: string;
  @ApiProperty({ example: '' })
  line: string;
  @ApiProperty({ example: '' })
  banner_en: string;
  @ApiProperty({ example: '' })
  banner_th: string;
  @ApiProperty({ example: '' })
  sub_banner_en: string;
  @ApiProperty({ example: '' })
  sub_banner_th: string;
}

export class CloseQuestDto {
  @ApiProperty({ example: 'open|close' })
  status: string;
}
