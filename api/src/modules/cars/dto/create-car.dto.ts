import { IsString, IsInt, IsEnum, IsBoolean, IsOptional, IsNumber, Min, Max, ArrayUnique } from 'class-validator';
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

  @ApiPropertyOptional({ type: [Number], description: 'Seat numbers on this car that cost extra' })
  @IsOptional()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayUnique()
  premiumSeatNumbers?: number[];

  @ApiPropertyOptional({ description: 'Extra amount (₦) charged per premium seat' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  premiumSeatSurcharge?: number;
}
