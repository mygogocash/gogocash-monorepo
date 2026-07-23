import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Allow, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * Self-service / admin user patch body. Inherits optional validators from
 * CreateUserDto. `consent` and legacy `data` are allowlisted so whitelist mode
 * does not 400 legitimate profile payloads (#46).
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  consent?: Record<string, unknown>;

  /** Legacy `{ data: {...} }` envelope unwrapped in UserService.updateProfile. */
  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  data?: Record<string, unknown>;
}
