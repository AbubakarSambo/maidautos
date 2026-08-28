import { IsString, IsInt, IsOptional, IsEnum, IsEmail, Min, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

// One seat's worth of passenger info. Each seat in a multi-seat purchase gets its own
// name/contact/next-of-kin, so the ticket for that seat reflects who's actually riding.
export class PassengerInputDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  seatNumber: number;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nokName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nokPhone?: string;

  // Admin booking this specific seat on behalf of an existing registered passenger
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passengerUserId?: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  tripId: string;

  @ApiProperty({ description: 'RouteStop ID for pickup' })
  @IsString()
  pickupStopId: string;

  @ApiProperty({ description: 'RouteStop ID for dropoff' })
  @IsString()
  dropoffStopId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ type: [PassengerInputDto], description: 'One entry per seat being purchased together' })
  @ValidateNested({ each: true })
  @Type(() => PassengerInputDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  passengers: PassengerInputDto[];
}
