import {
  CaliobaseMember,
  CaliobaseMemberInvitationToken,
  CaliobaseOrganization,
  ICaliobaseAccessTokenResponse,
  ICaliobaseApiRequestNoBody,
  ICaliobaseApiRequestWithBody,
  ICaliobaseApiRequestWithParam,
  ICaliobaseApiRequestWithParamAndBody,
  ICaliobaseApiRequestWithParamAndOptionalBody,
  ICaliobaseCompleteUploadRequest,
  ICaliobaseCreateObjectRequest,
  ICaliobaseCreateOrganizationRequest,
  ICaliobaseCreateRootRequest,
  ICaliobaseCreateUserWithPasswordRequest,
  ICaliobaseLoginRequest,
  ICaliobaseObjectStorageObject,
  ICaliobaseRefreshUploadUrlsRequest,
  ICaliobaseRequestPasswordResetRequest,
  ICaliobaseRootResponse,
  ICaliobaseSignedObjectPutUrl,
  ICaliobaseSignedObjectUpload,
  ICaliobaseSocialAuthBody,
  ISocialAuthUrlResponse,
  SocialAuthUrlRequest,
} from './types';

export type ICaliobaseApi = {
  root: {
    getRoot: ICaliobaseApiRequestNoBody<ICaliobaseRootResponse>;
    createRoot: ICaliobaseApiRequestWithBody<
      ICaliobaseCreateRootRequest,
      { organizationId: string }
    >;
  };
  objectStorage?: {
    createObjectStorageObject: ICaliobaseApiRequestWithBody<
      ICaliobaseCreateObjectRequest,
      {
        object: ICaliobaseObjectStorageObject;
        upload: ICaliobaseSignedObjectUpload;
      }
    >;
    completeUpload: ICaliobaseApiRequestWithParamAndBody<
      string,
      ICaliobaseCompleteUploadRequest,
      ICaliobaseObjectStorageObject
    >;
    refreshUploadUrls: ICaliobaseApiRequestWithParamAndBody<
      string,
      ICaliobaseRefreshUploadUrlsRequest,
      ICaliobaseSignedObjectPutUrl[]
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
    listUserMemberships: ICaliobaseApiRequestNoBody<CaliobaseMember[]>;
  };
  organization: {
    create: ICaliobaseApiRequestWithBody<
      ICaliobaseCreateOrganizationRequest,
      CaliobaseOrganization
    >;
    createInvitation: ICaliobaseApiRequestWithBody<
      Pick<CaliobaseMember, 'roles'>,
      CaliobaseMemberInvitationToken
    >;
    getInvitation: ICaliobaseApiRequestWithParam<
      string,
      CaliobaseMemberInvitationToken
    >;
    claimInvitation: ICaliobaseApiRequestWithParam<string, CaliobaseMember>;

    getOrganizationToken: ICaliobaseApiRequestWithParamAndOptionalBody<
      string,
      { joinAsGuestIfNotMember?: boolean },
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
