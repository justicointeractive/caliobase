import { Transporter } from 'nodemailer';
import { EmailLayout } from '../emails/layout';
import { Role } from '../entity-module/roles';

export const TOKEN_TOKEN = `\${token}` as const;

export type TokenAbsoluteUrl =
  `https://${string}${typeof TOKEN_TOKEN}${string}`;

export type MetaUrls = {
  forgotPassword: TokenAbsoluteUrl;
};

export function formatWithToken(url: TokenAbsoluteUrl, token: string) {
  return url.replaceAll(TOKEN_TOKEN, token);
}

export class CaliobaseConfig {
  urls!: MetaUrls;
  emailTransport!: Transporter;
  guestRole!: Role | false;
  allowCreateOwnOrganizations!: boolean;
  emailTemplates?: {
    layout?: typeof EmailLayout;
  };

  constructor(options: CaliobaseConfig) {
    Object.assign(this, options);
  }
}
