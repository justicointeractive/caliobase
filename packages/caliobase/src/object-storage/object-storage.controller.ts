import { Body, Controller, Param, Patch, Post, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsNumber, IsString } from 'class-validator';
import { SignedUploadUrl } from './AbstractObjectStorageProvider';
import {
  ObjectStorageObject,
  ObjectStorageObjectStatus,
  ObjectStorageObjectStatuses,
} from './object-storage-object.entity';
import { ObjectStorageService } from './object-storage.service';
import assert = require('assert');

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
  @IsIn(ObjectStorageObjectStatuses)
  @ApiProperty()
  status!: ObjectStorageObjectStatus;
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
    @Request() request: Express.Request
  ): Promise<ObjectStorageCreateResponse> {
    const { userId, organizationId } = request.user ?? {};
    assert(userId);
    assert(organizationId);

    const object = await this.objectStorageService.createObject({
      ...file,
      organization: { id: organizationId },
      uploadedBy: { id: userId },
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
    @Request() request: Express.Request
  ): Promise<ObjectStorageObject> {
    const { userId, organizationId } = request.user ?? {};
    assert(userId);
    assert(organizationId);

    const object = await this.objectStorageService.updateObject(objectId, {
      ...file,
    });

    return object;
  }
}
