import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class LoginSessionDto {
  @IsNumber()
  @IsNotEmpty()
  telegramUserId: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsString()
  @IsOptional()
  awaitingInput?: 'email' | 'mobile' | 'password' | null;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  mobile?: string;
}

export class TelegramLoginRequestDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  @IsNotEmpty()
  telegramUserId: number;
}

export class CompleteLoginDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}
