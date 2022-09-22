import { DynamicModule, Module, Provider } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { Role } from '../entity-module/roles';
import { CaliobaseConfig, MetaUrls } from './config';

export type CaliobaseConfigModuleOptions = {
  urls: MetaUrls;
  emailTransport: Transporter;
  guestRole?: Role | false;
  allowCreateOwnOrganizations: boolean;
};

@Module({})
export class CaliobaseConfigModule {
  static async forRootAsync({
    urls,
    emailTransport,
    guestRole = 'guest',
    allowCreateOwnOrganizations,
  }: CaliobaseConfigModuleOptions): Promise<DynamicModule> {
    const configProvider: Provider<CaliobaseConfig> = {
      provide: CaliobaseConfig,
      useValue: new CaliobaseConfig({
        urls,
        emailTransport,
        guestRole,
        allowCreateOwnOrganizations,
      }),
    };

    return {
      module: CaliobaseConfigModule,
      global: true,
      providers: [configProvider],
      exports: [configProvider],
    };
  }
}
