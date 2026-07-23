import { IsString, IsInt, IsArray, IsDateString, IsOptional, IsNumber, Min, Max, ArrayMinSize, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBulkTripsDto {
  @ApiProperty()
  @IsString()
  routeId: string;

  @ApiProperty()
  @IsString()
  carId: string;

  @ApiProperty()
  @IsString()
  driverId: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: '0=Sunday ... 6=Saturday', type: [Number], example: [1, 3, 5] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];

  @ApiProperty({ example: '07:30' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'departureTime must be in HH:mm format' })
  departureTime: string;

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
