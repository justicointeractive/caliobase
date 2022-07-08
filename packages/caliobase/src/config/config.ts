import { Transporter } from 'nodemailer';
import { Role } from '../entity-module/roles';

export class CaliobaseConfig {
  baseUrl!: string;
  emailTransport!: Transporter;
  guestRole!: Role | false;

  constructor(options: CaliobaseConfig) {
    Object.assign(this, options);
  }
}
