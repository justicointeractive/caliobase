import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { assert } from '../lib/assert';
import { SignedUploadUrl } from './AbstractObjectStorageProvider';
import {
  ObjectStorageObject,
  ObjectStorageObjectStatus,
  ObjectStorageObjectStatuses,
} from './object-storage-object.entity';
import { ObjectStorageService } from './object-storage.service';

export class ObjectStorageCreateRequest {
  @IsString()
  @ApiProperty()
  fileName!: string;

  @IsString()
  @ApiProperty()
  contentType!: string;

  @IsNumber()
  @ApiProperty()
  contentLength!: number;
}

export class ObjectStorageUpdateRequest {
  @IsOptional()
  @IsIn(ObjectStorageObjectStatuses)
  @ApiPropertyOptional()
  status?: ObjectStorageObjectStatus;
}

export class ObjectStorageCreateResponse {
  @ApiProperty()
  object!: ObjectStorageObject;

  @ApiProperty()
  signedUrl!: SignedUploadUrl;
}

@ApiTags('object-storage')
@Controller('object-storage')
@ApiBearerAuth()
export class ObjectStorageController {
  constructor(private objectStorageService: ObjectStorageService) {}

  @Post()
  @ApiBody({ type: ObjectStorageCreateRequest })
  @ApiCreatedResponse({
    type: ObjectStorageCreateResponse,
  })
  async createObjectStorageObject(
    @Body() file: ObjectStorageCreateRequest,
    @Request() request: RequestUser
  ): Promise<ObjectStorageCreateResponse> {
    const member = request.user?.member;
    assert(member, UnauthorizedException);
    const { user, organization } = member;

    const object = await this.objectStorageService.createObject({
      ...file,
      organization,
      uploadedBy: user,
    });

    return object;
  }

  @Patch(':objectId')
  @ApiBody({ type: ObjectStorageUpdateRequest })
  @ApiOkResponse({
    type: ObjectStorageObject,
  })
  async updateObjectStorageObject(
    @Param('objectId') objectId: string,
    @Body() file: ObjectStorageUpdateRequest,
    @Request() request: RequestUser
  ): Promise<ObjectStorageObject> {
    const member = request.user?.member;
    assert(member, UnauthorizedException);

    // TODO assert permission to update object
    const object = await this.objectStorageService.updateObject(objectId, {
      ...file,
    });

    return object;
  }
}
