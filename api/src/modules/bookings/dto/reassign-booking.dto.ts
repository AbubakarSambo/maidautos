import { IsString, IsOptional, IsEmail, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// An admin handing an existing booking's seat to a different passenger who has paid
// cash outside the system. At least one of guestEmail/guestPhone is required (enforced
// in the service, matching admin bookings).
export class ReassignBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nokName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nokPhone?: string;

  @ApiPropertyOptional({ description: 'Cash collected from the new passenger; defaults to the original ticket amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
