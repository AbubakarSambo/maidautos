import { IsString, IsInt, IsEnum, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarType } from '@prisma/client';

export class CreateCarDto {
  @ApiProperty({ example: 'ABC-123-DE' })
  @IsString()
  plateNumber: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  make: string;

  @ApiProperty({ example: 'Hiace' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(2000)
  year: number;

  @ApiProperty({ enum: CarType })
  @IsEnum(CarType)
  type: CarType;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  @Max(60)
  capacity: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  hasAC?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
