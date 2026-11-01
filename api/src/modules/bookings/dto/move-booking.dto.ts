import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// An admin moving a paid booking to another trip on the same pickup/dropoff stops.
export class MoveBookingDto {
  @ApiProperty({ description: 'Trip to move the booking to' })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  seatNumber: number;
}
