import { IsString, IsInt, Min, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// An admin moving a paid booking to another trip. Pass both stop ids to change the
// journey (route); omit them to keep the booking's current pickup and dropoff.
export class MoveBookingDto {
  @ApiProperty({ description: 'Trip to move the booking to' })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  seatNumber: number;

  @ApiPropertyOptional({ description: 'New pickup stop (Stop id, not RouteStop id)' })
  @IsOptional()
  @IsString()
  pickupStopId?: string;

  @ApiPropertyOptional({ description: 'New dropoff stop (Stop id, not RouteStop id)' })
  @IsOptional()
  @IsString()
  dropoffStopId?: string;
}
