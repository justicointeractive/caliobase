import { Transporter } from 'nodemailer';
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

  constructor(options: CaliobaseConfig) {
    Object.assign(this, options);
  }
}
