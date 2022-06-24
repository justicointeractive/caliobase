import { Transporter } from 'nodemailer';

export class CaliobaseConfig {
  baseUrl!: string;
  emailTransport!: Transporter;

  constructor(options: CaliobaseConfig) {
    Object.assign(this, options);
  }
}
