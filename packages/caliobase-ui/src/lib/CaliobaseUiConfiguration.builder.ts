import { CaliobaseUiConfiguration } from './CaliobaseUiConfiguration';
import { defaultFieldValues } from './commonFields';
import {
  Constructor,
  ContentTypeDescription,
  ContentTypeDescriptionInput,
  EntityApiConstructedEntityType,
  EntityApiName,
  ICaliobaseApi,
  ICaliobaseApiProps,
  ICaliobaseBrandingComponent,
  ICaliobaseEntityApi,
  ICaliobaseImageHandler,
  ProfileApiConstructedProfileType,
  ProfileApiName,
  ProfileTypeDescription,
} from './types';

export class CaliobaseUiConfigurationBuilder<TApi extends ICaliobaseApi> {
  public readonly contentTypes = new Map<
    EntityApiName<TApi>,
    ContentTypeDescription<TApi, any>
  >();

  public readonly profileTypes = new Map<
    ProfileApiName<TApi>,
    ProfileTypeDescription<TApi, any>
  >();

  public imageHandler?: ICaliobaseImageHandler<TApi, any>;
  public brandingComponent?: ICaliobaseBrandingComponent;

  constructor(
    public readonly Api: Constructor<[ICaliobaseApiProps], TApi>,
    public readonly baseApiParams: ICaliobaseApiProps
  ) {}

  useImageHandler<TImage>(handler: ICaliobaseImageHandler<TApi, TImage>) {
    this.imageHandler = handler;
    return this;
  }

  useBranding(handler: ICaliobaseBrandingComponent) {
    this.brandingComponent = handler;
    return this;
  }

  addEntity<TEntityName extends EntityApiName<TApi> & string>(
    name: TEntityName,
    description: ContentTypeDescriptionInput<
      EntityApiConstructedEntityType<TApi, TEntityName>
    >
  ) {
    const getApi = (api: TApi) =>
      api[name] as unknown as ICaliobaseEntityApi<
        EntityApiConstructedEntityType<TApi, TEntityName>
      >;

    const { frontEndBaseUrl } = this.baseApiParams;

    const frontEndItemPath = description.frontEndPath?.item;

    this.contentTypes.set(name, {
      ...description,
      frontEndUrl: {
        item: frontEndItemPath
          ? (item) =>
              `${frontEndBaseUrl}${frontEndItemPath(
                item as EntityApiConstructedEntityType<TApi, TEntityName>
              )}`
          : undefined,
      },
      fields: description.fields.map((field) => ({
        ...defaultFieldValues,
        ...field,
      })),
      getApi,
    });
    return this;
  }

  addProfileType<TProfileName extends ProfileApiName<TApi> & string>(
    name: TProfileName,
    description: ContentTypeDescriptionInput<
      ProfileApiConstructedProfileType<TApi, TProfileName>
    >
  ) {
    this.profileTypes.set(name, {
      ...description,
      fields: description.fields.map((field) => ({
        ...defaultFieldValues,
        ...field,
      })),
    });
    return this;
  }

  build() {
    return new CaliobaseUiConfiguration(this);
  }
}
