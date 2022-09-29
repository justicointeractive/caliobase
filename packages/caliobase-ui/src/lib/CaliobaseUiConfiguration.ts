import { invariant } from 'circumspect';
import { assert } from './assert';
import { CaliobaseUiConfigurationBuilder } from './CaliobaseUiConfiguration.builder';
import { rolesField, userEmailField } from './commonFields';
import { ICaliobaseApi } from './ICaliobaseApi';
import {
  ContentField,
  EntityApiName,
  ICaliobaseApiProps,
  ICaliobaseCompletedUploadPart,
  InferApiResponseType,
} from './types';

export type FileUploadProgressHandler = (event: {
  loaded: number;
  total: number;
}) => void;

export class CaliobaseUiConfiguration<TApi extends ICaliobaseApi> {
  constructor(
    private readonly builder: CaliobaseUiConfigurationBuilder<TApi>
  ) {}

  get baseApiParams() {
    return this.builder.baseApiParams;
  }

  get Api() {
    return this.builder.Api;
  }

  get brandingComponent() {
    return this.builder.brandingComponent;
  }

  // TODO: exclude this function if no object storage provider
  async uploadFile<TApi extends ICaliobaseApi>(
    api: TApi,
    file: File,
    onProgress?: FileUploadProgressHandler
  ) {
    invariant(api.objectStorage, 'object storage not available');

    const {
      data: {
        object,
        upload: { parts: signedPartUrls, uploadId },
      },
    } = await api.objectStorage.createObjectStorageObject({
      contentLength: file.size,
      contentType: file.type,
      fileName: file.name,
    });

    const partPromises: (Promise<ICaliobaseCompletedUploadPart> & {
      loaded: number;
    })[] = signedPartUrls.map((signedUrl) => {
      const partPromise = Object.assign(
        new Promise<ICaliobaseCompletedUploadPart>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(signedUrl.method, signedUrl.url);
          xhr.addEventListener('readystatechange', (e) =>
            console.log({ xhr, e })
          );
          xhr.addEventListener('load', () => {
            const etag = xhr.getResponseHeader('etag') ?? '';
            return resolve({
              etag,
              part: signedUrl.part,
            });
          });
          xhr.addEventListener('error', (err) => reject(err));
          if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
              partPromise.loaded = e.loaded;
              onProgress({
                loaded: partPromises.reduce(
                  (sum, part) => sum + part.loaded,
                  0
                ),
                total: file.size,
              });
            });
          }
          xhr.send(file.slice(signedUrl.rangeStart, signedUrl.rangeEnd));
        }),
        { loaded: 0 }
      );

      return partPromise;
    });

    const completedParts = await Promise.all(partPromises);

    const { data: objectStorageObject } =
      await api.objectStorage.completeUpload(object.id, {
        parts: completedParts,
        uploadId,
      });

    // TODO: can the method calls automatically return the actual api types rather than needing to be cast here?
    return objectStorageObject as InferApiResponseType<
      NonNullable<TApi['objectStorage']>['completeUpload']
    >;
  }

  createApiClient(props: ICaliobaseApiProps) {
    return new this.builder.Api(props);
  }

  createImageHandler(api: TApi) {
    if (this.builder.imageHandler == null) {
      throw new Error('no image handler provided');
    }
    return this.builder.imageHandler(api, this);
  }

  listContentTypes() {
    return [...this.builder.contentTypes.keys()].map((type) => ({
      type,
      description: this.getContentType(type),
    }));
  }

  getContentType(name: EntityApiName<TApi>) {
    const description = this.builder.contentTypes.get(name);
    assert(description);
    return description;
  }

  getBuiltInFields(
    builtInType:
      | 'user'
      | 'userProfile'
      | 'organization-member'
      | 'user-member'
      | 'organization'
      | 'organizationProfile'
  ) {
    const userProfileFields =
      this.builder.profileTypes.get('userProfile' as any)?.fields ?? [];

    const organizationProfileFields =
      this.builder.profileTypes.get('organizationProfile' as any)?.fields ?? [];

    const prefixedUserProfileFields = prefixFieldProperties(
      userProfileFields,
      'profile'
    );

    const prefixedOrganizationProfileFields = prefixFieldProperties(
      organizationProfileFields,
      'profile'
    );

    switch (builtInType) {
      case 'user':
        return [...prefixedUserProfileFields];
      case 'userProfile':
        return [...userProfileFields];
      case 'organization-member': // list organization users
        return [
          ...prefixFieldProperties(
            [userEmailField, ...prefixedUserProfileFields],
            'user'
          ),
          rolesField,
        ];
      case 'user-member': // list user organizations
        return [
          ...prefixFieldProperties(
            [...prefixedOrganizationProfileFields],
            'organization'
          ),
          rolesField,
        ];
      case 'organization':
        return [...prefixedOrganizationProfileFields];
      case 'organizationProfile':
        return [...organizationProfileFields];
    }
  }
}

function prefixFieldProperties(
  fields: ContentField<string, any, any>[],
  prefix: string
) {
  return fields.map((field) => ({
    ...field,
    property: `${prefix}.${field.property}`,
    readOnly: true,
  }));
}
