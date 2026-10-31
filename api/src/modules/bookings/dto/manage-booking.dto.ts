import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Identifies a booking for self-service management. A logged-in owner (or an admin)
// only needs the ticket code; anyone else must also supply the email or phone number
// the booking was made with.
export class ManageBookingLookupDto {
  @ApiProperty()
  @IsString()
  ticketCode: string;

  @ApiPropertyOptional({ description: 'Email or phone the booking was made with (required unless logged in as the owner)' })
  @IsOptional()
  @IsString()
  contact?: string;
}

export class ChangeBookingDto extends ManageBookingLookupDto {
  @ApiProperty({ description: 'Trip to move the booking to' })
  @IsString()
  tripId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  seatNumber: number;
}
