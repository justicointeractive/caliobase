import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateOrganizationRequest {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;
}
