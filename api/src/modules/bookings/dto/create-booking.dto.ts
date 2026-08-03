import { IsString, IsInt, IsOptional, IsEnum, IsEmail, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  tripId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  seatNumber: number;

  @ApiProperty({ description: 'RouteStop ID for pickup' })
  @IsString()
  pickupStopId: string;

  @ApiProperty({ description: 'RouteStop ID for dropoff' })
  @IsString()
  dropoffStopId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  // Guest fields — required when not authenticated
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestPhone?: string;

  // Next of kin — collected for all passengers as a safety contact
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nokName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nokPhone?: string;

  // Admin booking on behalf of a passenger
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passengerUserId?: string;
}
