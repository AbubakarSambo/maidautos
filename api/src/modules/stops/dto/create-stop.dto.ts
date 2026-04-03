import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStopDto {
  @ApiProperty({ example: 'Abuja' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'FCT' })
  @IsString()
  state: string;
}
