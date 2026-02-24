import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestDto {
  @ApiProperty({ example: '2024-01-01' })
  start_date: Date;
  @ApiProperty({ example: '2024-01-31' })
  end_date: Date;
  @ApiProperty({ example: 'open|close' })
  status: string;
}

export class CloseQuestDto {
  @ApiProperty({ example: 'open|close' })
  status: string;
}
