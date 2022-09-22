import {
  CaliobaseMember,
  CaliobaseMemberInvitationToken,
  CaliobaseOrganization,
  ICaliobaseAccessTokenResponse,
  ICaliobaseApiRequestNoBody,
  ICaliobaseApiRequestWithBody,
  ICaliobaseApiRequestWithParam,
  ICaliobaseApiRequestWithParamAndBody,
  ICaliobaseCreateObjectRequest,
  ICaliobaseCreateOrganizationRequest,
  ICaliobaseCreateRootRequest,
  ICaliobaseCreateUserWithPasswordRequest,
  ICaliobaseLoginRequest,
  ICaliobaseObjectStorageObject,
  ICaliobaseRequestPasswordResetRequest,
  ICaliobaseRootResponse,
  ICaliobaseSignedObjectPutUrl,
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
