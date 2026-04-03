import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddStatusUpdateDto {
  @ApiProperty({ example: 'Kaduna' })
  @IsString()
  checkpointLabel: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
