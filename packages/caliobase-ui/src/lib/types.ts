import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { ComponentClass, FunctionComponent } from 'react';
import type { DetailEditorComponent } from '../components/data/DetailEditorComponent';
import type { TableCellComponent } from '../components/data/TableCellComponent';
import type { CaliobaseUiConfiguration } from './CaliobaseUiConfiguration';

export type CaliobaseUser = {
  id: string;
  email: string;
  profile?: any;
};

export type CaliobaseOrganization = {
  id: string;
  profile?: any;
};

export type CaliobaseMember = {
  user: CaliobaseUser;
  userId: string;
  organization: CaliobaseOrganization;
  organizationId: string;
  roles: string[];
};

export type CaliobaseMemberInvitationToken = {
  token: string;
  organization: CaliobaseOrganization;
  roles: string[];
};

export type ICaliobaseApiRequestNoBody<T> = (
  options?: RequestInit
) => Promise<{ data: T }>;

export type ICaliobaseApiRequestWithBody<TBody, T> = (
  body: TBody,
  options?: RequestInit
) => Promise<{ data: T }>;

export type ICaliobaseApiRequestWithQuery<TQuery, T> = (
  query: TQuery,
  options?: RequestInit
) => Promise<{ data: T }>;

export type ICaliobaseApiRequestWithParam<TParam, T> = (
  param: TParam,
  options?: RequestInit
) => Promise<{ data: T }>;

export type ICaliobaseApiRequestWithParamAndBody<TParam, TBody, T> = (
  param: TParam,
  body: TBody,
  options?: RequestInit
) => Promise<{ data: T }>;

export type InferApiResponseType<TRequest> = TRequest extends (
  ...args: any[]
) => Promise<{ data: infer D }>
  ? D
  : never;

// HACK: no way to treat string enum member as a string
// https://github.com/microsoft/TypeScript/issues/30611
type StringEnumMember = string | any;

export type SocialAuthUrlRequest = { provider: StringEnumMember };

export type ISocialAuthUrlResponse = {
  authUrl: string;
  nonce: string;
};

export type ICaliobaseRootResponse = {
  rootOrgId: string;
  hasRootMember: boolean;
  allRoles: string[];
  socialProviders: { name: string; label: string }[];
};

export type ICaliobaseApiProps = {
  baseUrl: string;
  baseApiParams?: RequestInit;
  frontEndBaseUrl: string;
  preferredLoginMethod: 'password' | 'social';
};

export type ICaliobaseLoginRequest = {
  email: string;
  password: string;
};

export type ICaliobaseCreateUserWithPasswordRequest = {
  email: string;
  password: string;
  profile: any;
};

export type ICaliobaseRequestPasswordResetRequest = {
  email: string;
};

export type ICaliobaseAccessTokenResponse = {
  accessToken: string;
};

export type ICaliobaseSocialAuthBody = {
  provider: StringEnumMember;
  idToken?: string;
  accessToken?: string;
  nonce: string;
};

export type ICaliobaseCreateRootRequest = {
  organization: Omit<CaliobaseOrganization, 'id'>;
  user: Omit<CaliobaseUser, 'id'> & {
    password: string;
  };
};

export type ICaliobaseCreateObjectRequest = {
  fileName: string;
  contentType: string;
  contentLength: number;
};

export type ICaliobaseObjectStorageObject = {
  id: string;
  status: string;
  contentLength: number;
  contentType: string;
  cdnUrl: string;
};

export type ICaliobaseSignedObjectPutUrl = {
  method: string;
  url: string;
};

export type ICaliobaseApi = {
  root: {
    getRoot: ICaliobaseApiRequestNoBody<ICaliobaseRootResponse>;
    createRoot: ICaliobaseApiRequestWithBody<
      ICaliobaseCreateRootRequest,
      { organizationId: string }
    >;
  };
  objectStorage: {
    createObjectStorageObject: ICaliobaseApiRequestWithBody<
      ICaliobaseCreateObjectRequest,
      {
        object: ICaliobaseObjectStorageObject;
        signedUrl: ICaliobaseSignedObjectPutUrl;
      }
    >;
    updateObjectStorageObject: ICaliobaseApiRequestWithParamAndBody<
      string,
      Partial<ICaliobaseObjectStorageObject>,
      ICaliobaseObjectStorageObject
    >;
  };
  auth: {
    socialAuthUrl: ICaliobaseApiRequestWithBody<
      SocialAuthUrlRequest,
      ISocialAuthUrlResponse
    >;
    socialValidate: ICaliobaseApiRequestWithBody<
      ICaliobaseSocialAuthBody,
      ICaliobaseAccessTokenResponse
    >;
    loginUser: ICaliobaseApiRequestWithBody<
      ICaliobaseLoginRequest,
      ICaliobaseAccessTokenResponse
    >;
    createUserWithPassword: ICaliobaseApiRequestWithBody<
      ICaliobaseCreateUserWithPasswordRequest,
      ICaliobaseAccessTokenResponse
    >;
    emailResetToken: ICaliobaseApiRequestWithBody<
      ICaliobaseRequestPasswordResetRequest,
      void
    >;
  };
  organization: {
    createInvitation: ICaliobaseApiRequestWithBody<
      Pick<CaliobaseMember, 'roles'>,
      CaliobaseMemberInvitationToken
    >;
    getInvitation: ICaliobaseApiRequestWithParam<
      string,
      CaliobaseMemberInvitationToken
    >;
    claimInvitation: ICaliobaseApiRequestWithParam<string, CaliobaseMember>;

    getOrganizationToken: ICaliobaseApiRequestWithParam<
      string,
      { accessToken: string }
    >;

    listMembers: ICaliobaseApiRequestNoBody<CaliobaseMember[]>;
    getMember: ICaliobaseApiRequestWithParam<string, CaliobaseMember>;
    updateMember: ICaliobaseApiRequestWithParamAndBody<
      string,
      Pick<CaliobaseMember, 'roles'>,
      CaliobaseMember
    >;
  };
};

export type ICaliobaseEntityApi<T extends { id: string }> = {
  create: ICaliobaseApiRequestWithBody<any, { item: T }>;
  findOne: ICaliobaseApiRequestWithParam<string, { item?: T }>;
  findAll: ICaliobaseApiRequestWithQuery<
    {
      skip?: number;
      limit?: number;
    },
    {
      items: T[];
      count?: number;
    }
  >;
  update: ICaliobaseApiRequestWithParamAndBody<string, any, { items: T[] }>;
  remove: ICaliobaseApiRequestWithParam<string, { items: T[] }>;
};

export type EntityApiName<TApi> = {
  [K in keyof TApi]: TApi[K] extends ICaliobaseEntityApi<any>
    ? K extends string
      ? K
      : never
    : never;
}[keyof TApi];

export type EntityApiConstructedEntityType<
  TApi,
  TEntityName extends EntityApiName<TApi>
> = TApi[TEntityName] extends ICaliobaseEntityApi<infer U> ? U : never;

export type ICaliobaseProfileApi<T> = {
  create: ICaliobaseApiRequestWithParamAndBody<string, any, { item: T }>;
  findOne: ICaliobaseApiRequestWithParam<string, { item?: T }>;
  findAll: ICaliobaseApiRequestWithQuery<any, { items: T[] }>;
  update: ICaliobaseApiRequestWithParamAndBody<string, any, { items: T[] }>;
  remove: ICaliobaseApiRequestWithParam<string, { items: T[] }>;
};

export type ProfileApiName<TApi> = {
  [K in keyof TApi]: TApi[K] extends ICaliobaseProfileApi<any> ? K : never;
}[keyof TApi];

export type ProfileApiConstructedProfileType<
  TApi,
  TProfileName extends ProfileApiName<TApi>
> = TApi[TProfileName] extends ICaliobaseProfileApi<infer U> ? U : never;

export type Constructor<TParams extends unknown[], T> = new (
  ...props: TParams
) => T;

export type ContentFieldInput<
  TProperty extends string,
  TValue,
  TEditorOptions
> = {
  label: string;
  property: TProperty;
  readOnly?: boolean;
  defaultValue: () => TValue | null;
  editorColumn?: 'main' | 'meta';
  editor?: DetailEditorComponent<TValue, TEditorOptions> | null;
  editorOptions?: TEditorOptions;
  tableCell?: {
    component?: TableCellComponent<any>;
    width?: string;
    options?: Record<string, unknown>;
  } | null;
};

export type ContentField<TProperty extends string, TValue, TOptions> = Required<
  ContentFieldInput<TProperty, TValue, TOptions>
>;

export type ContentTypeDescriptionInput<TEntity> = {
  label: {
    singular: string;
    plural: string;
  };
  fields: ContentFieldInput<keyof TEntity & string, any, any>[];
  menuItemIcon?: IconDefinition;
  frontEndPath?: {
    item?: (item: TEntity) => string;
  };
};

export type ContentTypeDescription<
  TApi extends ICaliobaseApi,
  TEntity extends { id: string }
> = {
  label: {
    singular: string;
    plural: string;
  };
  fields: ContentField<keyof TEntity & string, any, any>[];
  menuItemIcon?: IconDefinition;
  frontEndUrl?: {
    item?: (item: TEntity) => string;
  };
  getApi: (api: TApi) => ICaliobaseEntityApi<TEntity>;
};

export type ProfileTypeDescription<
  TApi extends ICaliobaseApi,
  TEntity extends { id: string }
> = {
  label: {
    singular: string;
    plural: string;
  };
  fields: ContentField<keyof TEntity & string, any, any>[];
  menuItemIcon?: IconDefinition;
};

export type ICaliobaseImageHandler<TApi extends ICaliobaseApi, TImage> = (
  api: TApi,
  caliobaseUiConfiguration: CaliobaseUiConfiguration<TApi>
) => {
  uploadImageFile(file: File): Promise<TImage>;
  uploadImageUrl(url: string): Promise<TImage>;
  toUrl(image: TImage): string;
};

type BrandingComponentProps = {
  organization?: CaliobaseOrganization;
  className?: string;
};

export type ICaliobaseBrandingComponent =
  | FunctionComponent<BrandingComponentProps>
  | ComponentClass<BrandingComponentProps>;
