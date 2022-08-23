import Axios from 'axios';

import { SocialProvider, SocialValidation } from './social-provider';

export const FacebookSocialProvider: SocialProvider = {
  name: 'facebook',
  label: 'Facebook',
  validate: async (body: SocialValidation) => {
    const { data } = await Axios.get(`https://graph.facebook.com/v11.0/me`, {
      params: {
        fields: 'id,first_name,last_name,email',
        access_token: body.accessToken,
      },
    });

    return {
      socialProfile: {
        ...body,
        providerUserId: data.id,
        name: {
          givenName: data.first_name,
          familyName: data.last_name,
        },
        email: data.email,
      },
      providerTokenClaims: data,
    };
  },
};
