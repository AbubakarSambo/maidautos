import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  message: string;

  // Hidden form field — real users never fill it in. Any value here means a bot
  // filled every field, so we accept the request but silently drop it.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;
}
