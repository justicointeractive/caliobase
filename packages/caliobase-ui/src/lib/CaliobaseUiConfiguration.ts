import { assert } from './assert';
import { CaliobaseUiConfigurationBuilder } from './CaliobaseUiConfiguration.builder';
import { rolesField, userEmailField } from './commonFields';
import {
  ContentField,
  EntityApiName,
  ICaliobaseApi,
  ICaliobaseApiProps,
  InferApiResponseType,
} from './types';

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

  async uploadFile<TApi extends ICaliobaseApi>(api: TApi, file: File) {
    const {
      data: { object, signedUrl },
    } = await api.objectStorage.createObjectStorageObject({
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size,
    });

    const putResponse = await fetch(signedUrl.url, {
      method: signedUrl.method,
      body: file,
    });

    if (putResponse.status !== 200) {
      throw new Error('invalid response');
    }

    const { data: objectStorageObject } =
      await api.objectStorage.updateObjectStorageObject(object.id, {
        status: 'ready',
      });

    // TODO: can the method calls automatically return the actual api types rather than needing to be cast here?
    return objectStorageObject as InferApiResponseType<
      TApi['objectStorage']['updateObjectStorageObject']
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
