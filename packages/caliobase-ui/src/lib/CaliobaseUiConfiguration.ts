import { invariant } from 'circumspect';
import { assert } from './assert';
import { CaliobaseUiConfigurationBuilder } from './CaliobaseUiConfiguration.builder';
import { rolesField, userEmailField } from './commonFields';
import { ICaliobaseApi } from './ICaliobaseApi';
import { pMap } from './pMap';
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

class ExpiredSignedUrlError extends Error {
  constructor(public readonly partNumber: number) {
    super(`Signed URL expired for part ${partNumber}`);
    this.name = 'ExpiredSignedUrlError';
  }
}

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

  get menuItems() {
    return this.builder.menuItems;
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

    const signedUrlMap = new Map(signedPartUrls.map((p) => [p.part, p]));
    const partProgressMap = new Map<number, number>();

    const reportProgress = () => {
      if (onProgress) {
        let loaded = 0;
        for (const bytes of partProgressMap.values()) {
          loaded += bytes;
        }
        onProgress({ loaded, total: file.size });
      }
    };

    const uploadPart = (
      partNumber: number
    ): Promise<ICaliobaseCompletedUploadPart> => {
      const signedUrl = signedUrlMap.get(partNumber);
      invariant(signedUrl, `signed URL not found for part ${partNumber}`);

      return new Promise<ICaliobaseCompletedUploadPart>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(signedUrl.method, signedUrl.url);

        xhr.addEventListener('load', () => {
          if (xhr.status === 403) {
            // Signed URL expired
            return reject(new ExpiredSignedUrlError(partNumber));
          }
          if (xhr.status < 200 || xhr.status >= 300) {
            return reject(new Error(`Upload failed with status ${xhr.status}`));
          }
          const etag = xhr.getResponseHeader('etag');
          if (!etag) {
            return reject(
              new Error(
                `etag not found in response, configure object storage provider CORS policy to expose ETag header`
              )
            );
          }
          return resolve({ etag, part: partNumber });
        });

        xhr.addEventListener('error', () =>
          reject(new Error('Network error during upload'))
        );

        xhr.upload.addEventListener('progress', (e) => {
          partProgressMap.set(partNumber, e.loaded);
          reportProgress();
        });

        xhr.send(file.slice(signedUrl.rangeStart, signedUrl.rangeEnd));
      });
    };

    const uploadPartWithRetry = async (
      partNumber: number
    ): Promise<ICaliobaseCompletedUploadPart> => {
      try {
        return await uploadPart(partNumber);
      } catch (err) {
        if (err instanceof ExpiredSignedUrlError) {
          invariant(api.objectStorage, 'object storage not available');
          const { data: refreshedUrls } =
            await api.objectStorage.refreshUploadUrls(object.id, {
              uploadId,
              parts: [partNumber],
            });
          for (const refreshedUrl of refreshedUrls) {
            signedUrlMap.set(refreshedUrl.part, refreshedUrl);
          }
          return await uploadPart(partNumber);
        }
        throw err;
      }
    };

    const partNumbers = signedPartUrls.map((p) => p.part);
    const completedParts = await pMap(partNumbers, uploadPartWithRetry, {
      concurrency: 5,
    });

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
