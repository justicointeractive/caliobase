/* eslint-disable */
/* tslint:disable */
/*
 * ------------------------------------------------------------------
 * # THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API-NEXTGEN     #
 * # AUTHORS: acacode & grandsilence                                #
 * # https://github.com/grandsilence/swagger-typescript-api-nextgen #
 * ------------------------------------------------------------------
 */

export enum SocialProviderName {
  Facebook = 'facebook',
}

export interface SocialRequestBody {
  provider: SocialProviderName;
}

export interface SocialAuthUrlResponse {
  authUrl: string;
  nonce: string;
}

export interface SocialValidateBody {
  provider: SocialProviderName;
  idToken?: string;
  accessToken?: string;
  nonce?: string;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: object;
}

export interface SocialProfileName {
  givenName: string;
  familyName: string;
}

export interface SocialProfile {
  provider: string;
  providerUserId: string;
  accessToken?: string;
  name: SocialProfileName;
  email: string;
  emailVerified: boolean;
}

export interface SocialAuthenticationResponse {
  accessToken: string;
  user: User;
  socialProfile: SocialProfile;
  providerTokenClaims: object;
}

export interface UserSignupBody {
  email: string;
  password: string;
  profile: object;
}

export interface AuthenticationResponse {
  accessToken: string;
  user: User;
}

export interface UserLoginBody {
  email: string;
  password: string;
}

export interface Organization {
  id: string;
  profile: object;
}

export interface Member {
  organizationId: string;
  organization: Organization;
  userId: string;
  user: User;
  roles: string[];
}

export interface CaliobaseRequestUser {
  user: User;
  organization: Organization;
  member: Member;
}

export interface UpdatePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePasswordResponse {
  success: boolean;
}

export interface CreatePasswordResetTokenBody {
  email: string;
}

export interface ResetWithTokenBody {
  password: string;
  token: string;
}

export interface ConcreteCreateOrganizationRequest {
  profile: object;
}

export interface AccessTokenResponse {
  accessToken: string;
}

export interface CreateInvitationRequest {
  roles: string[];
}

export interface MemberInvitationToken {
  token: string;

  /** @format date-time */
  validUntil: string;
  organization: Organization;
  invitedBy: User;
  roles: string[];
}

export enum Role {
  Owner = 'owner',
  Manager = 'manager',
  Writer = 'writer',
  Moderator = 'moderator',
  Guest = 'guest',
}

export interface LabeledSocialProvider {
  name: string;
  label: string;
}

export interface GetRootResponse {
  hasRootMember: boolean;
  rootOrgId: string;
  allRoles: Role[];
  socialProviders: LabeledSocialProvider[];
}

export interface CreateRootRequest {
  user: UserSignupBody;
  organization: ConcreteCreateOrganizationRequest;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>;

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  'body' | 'method' | 'query' | 'path'
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'>;
  securityWorker?: (
    securityData: SecurityDataType | null
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = '';
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: 'same-origin',
    headers: {},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  private encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(
      typeof value === 'number' ? value : `${value}`
    )}`;
  }

  private addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  private addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join('&');
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => 'undefined' !== typeof query[key]
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key)
      )
      .join('&');
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : '';
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string')
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === 'object' && property !== null
            ? JSON.stringify(property)
            : `${property}`
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  private mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  private createAbortSignal = (
    cancelToken: CancelToken
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ''}${path}${
        queryString ? `?${queryString}` : ''
      }`,
      {
        ...requestParams,
        headers: {
          ...(type && type !== ContentType.FormData
            ? { 'Content-Type': type }
            : {}),
          ...(requestParams.headers || {}),
        },
        signal: cancelToken
          ? this.createAbortSignal(cancelToken)
          : requestParams.signal,
        body:
          typeof body === 'undefined' || body === null
            ? null
            : payloadFormatter(body),
      }
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title caliobase
 * @version 1.0
 * @contact
 *
 * The caliobase app API description
 */
export class Api<
  SecurityDataType extends unknown
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @name GetData
     * @request GET:/api
     */
    getData: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api`,
        method: 'GET',
        ...params,
      }),
  };
  auth = {
    /**
     * No description
     *
     * @tags auth
     * @name SocialAuthUrl
     * @request POST:/api/auth/social/authUrl
     * @secure
     */
    socialAuthUrl: (data: SocialRequestBody, params: RequestParams = {}) =>
      this.request<SocialAuthUrlResponse, any>({
        path: `/api/auth/social/authUrl`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name SocialAuthUrlReturn
     * @request GET:/api/auth/social/authUrl/return
     * @secure
     */
    socialAuthUrlReturn: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/auth/social/authUrl/return`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name SocialAuthUrlReturnPost
     * @request POST:/api/auth/social/authUrl/return
     * @secure
     */
    socialAuthUrlReturnPost: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/auth/social/authUrl/return`,
        method: 'POST',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name SocialValidate
     * @request POST:/api/auth/social/validate
     * @secure
     */
    socialValidate: (data: SocialValidateBody, params: RequestParams = {}) =>
      this.request<SocialAuthenticationResponse, any>({
        path: `/api/auth/social/validate`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name CreateUserWithPassword
     * @request POST:/api/auth/user/create
     * @secure
     */
    createUserWithPassword: (
      data: UserSignupBody,
      params: RequestParams = {}
    ) =>
      this.request<AuthenticationResponse, any>({
        path: `/api/auth/user/create`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name LoginUser
     * @request POST:/api/auth/user/login
     * @secure
     */
    loginUser: (data: UserLoginBody, params: RequestParams = {}) =>
      this.request<AuthenticationResponse, any>({
        path: `/api/auth/user/login`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name GetMe
     * @request GET:/api/auth/me
     * @secure
     */
    getMe: (params: RequestParams = {}) =>
      this.request<CaliobaseRequestUser, any>({
        path: `/api/auth/me`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name UpdatePassword
     * @request PATCH:/api/auth/me/password
     * @secure
     */
    updatePassword: (data: UpdatePasswordBody, params: RequestParams = {}) =>
      this.request<UpdatePasswordResponse, any>({
        path: `/api/auth/me/password`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name EmailResetToken
     * @request POST:/api/auth/user/password/emailResetToken
     * @secure
     */
    emailResetToken: (
      data: CreatePasswordResetTokenBody,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/auth/user/password/emailResetToken`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name ResetWithToken
     * @request POST:/api/auth/user/password/resetWithToken
     * @secure
     */
    resetWithToken: (data: ResetWithTokenBody, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/auth/user/password/resetWithToken`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name ListUserMemberships
     * @request GET:/api/auth
     * @secure
     */
    listUserMemberships: (params: RequestParams = {}) =>
      this.request<Member[], any>({
        path: `/api/auth`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  organization = {
    /**
     * No description
     *
     * @tags organization
     * @name Create
     * @request POST:/api/organization
     * @secure
     */
    create: (
      data: ConcreteCreateOrganizationRequest,
      params: RequestParams = {}
    ) =>
      this.request<Organization, any>({
        path: `/api/organization`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name GetRootOrganizationToken
     * @request POST:/api/organization/token
     * @secure
     */
    getRootOrganizationToken: (params: RequestParams = {}) =>
      this.request<AccessTokenResponse, any>({
        path: `/api/organization/token`,
        method: 'POST',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name GetOrganizationToken
     * @request POST:/api/organization/{id}/token
     * @secure
     */
    getOrganizationToken: (id: string, params: RequestParams = {}) =>
      this.request<AccessTokenResponse, any>({
        path: `/api/organization/${id}/token`,
        method: 'POST',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name CreateInvitation
     * @request POST:/api/organization/invitation
     * @secure
     */
    createInvitation: (
      data: CreateInvitationRequest,
      params: RequestParams = {}
    ) =>
      this.request<MemberInvitationToken, any>({
        path: `/api/organization/invitation`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name GetInvitation
     * @request GET:/api/organization/invitation/{token}
     * @secure
     */
    getInvitation: (token: string, params: RequestParams = {}) =>
      this.request<MemberInvitationToken, any>({
        path: `/api/organization/invitation/${token}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name ClaimInvitation
     * @request POST:/api/organization/invitation/{token}/claim
     * @secure
     */
    claimInvitation: (token: string, params: RequestParams = {}) =>
      this.request<Member, any>({
        path: `/api/organization/invitation/${token}/claim`,
        method: 'POST',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name ListMembers
     * @request GET:/api/organization/member
     * @secure
     */
    listMembers: (params: RequestParams = {}) =>
      this.request<Member[], any>({
        path: `/api/organization/member`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name GetMember
     * @request GET:/api/organization/member/{userId}
     * @secure
     */
    getMember: (userId: string, params: RequestParams = {}) =>
      this.request<Member, any>({
        path: `/api/organization/member/${userId}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name UpdateMember
     * @request PATCH:/api/organization/member/{userId}
     * @secure
     */
    updateMember: (
      userId: string,
      data: CreateInvitationRequest,
      params: RequestParams = {}
    ) =>
      this.request<Member, any>({
        path: `/api/organization/member/${userId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags organization
     * @name RemoveMember
     * @request DELETE:/api/organization/member/{userId}
     * @secure
     */
    removeMember: (userId: string, params: RequestParams = {}) =>
      this.request<Member, any>({
        path: `/api/organization/member/${userId}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  root = {
    /**
     * No description
     *
     * @tags root
     * @name GetRoot
     * @request GET:/api/root
     */
    getRoot: (params: RequestParams = {}) =>
      this.request<GetRootResponse, any>({
        path: `/api/root`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags root
     * @name CreateRoot
     * @request POST:/api/root
     */
    createRoot: (data: CreateRootRequest, params: RequestParams = {}) =>
      this.request<Member, any>({
        path: `/api/root`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
}
