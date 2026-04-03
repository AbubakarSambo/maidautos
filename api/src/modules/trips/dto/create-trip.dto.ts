import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty()
  @IsString()
  routeId: string;

  @ApiProperty()
  @IsString()
  carId: string;

  @ApiProperty()
  @IsString()
  driverId: string;

  @ApiProperty()
  @IsDateString()
  departureDateTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
