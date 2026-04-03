import { IsString, IsInt, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RouteStopDto {
  @ApiProperty()
  @IsString()
  stopId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  distanceFromOriginKm: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  priceFromOrigin: number;
}

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  originStopId: string;

  @ApiProperty()
  @IsString()
  destinationStopId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes: number;

  @ApiProperty({ type: [RouteStopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops: RouteStopDto[];
}
