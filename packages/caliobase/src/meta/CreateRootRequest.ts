import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UserSignupBody } from '../auth';
import { CreateOrganizationRequest } from '../auth/CreateOrganizationRequest';

export class CreateRootRequest {
  @ValidateNested()
  @Type(() => UserSignupBody)
  @ApiProperty()
  user!: UserSignupBody;

  @ValidateNested()
  @Type(() => CreateOrganizationRequest)
  @ApiProperty()
  organization!: CreateOrganizationRequest;
}
