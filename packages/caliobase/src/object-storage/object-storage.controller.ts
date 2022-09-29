import {
  Body,
  Controller,
  Param,
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
  ApiTags,
} from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { assert } from '../lib/assert';
import { CompleteUploadRequest, Upload } from './AbstractObjectStorageProvider';
import { ObjectStorageObject } from './object-storage-object.entity';
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

export class ObjectStorageCreateResponse {
  @ApiProperty()
  object!: ObjectStorageObject;

  @ApiProperty()
  upload!: Upload;
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

  @Post(':objectId/complete')
  @ApiBody({ type: CompleteUploadRequest })
  @ApiOkResponse({
    type: ObjectStorageObject,
  })
  async completeUpload(
    @Param('objectId') objectId: string,
    @Body() completeUploadRequest: CompleteUploadRequest,
    @Request() request: RequestUser
  ): Promise<ObjectStorageObject> {
    const member = request.user?.member;
    assert(member, UnauthorizedException);

    const object = await this.objectStorageService.completeUpload(objectId, {
      ...completeUploadRequest,
    });

    return object;
  }
}
