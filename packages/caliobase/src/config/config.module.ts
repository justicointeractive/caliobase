import { DynamicModule, Module, Provider } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { Role } from '../entity-module/roles';
import { CaliobaseConfig } from './config';

export type CaliobaseConfigModuleOptions = {
  baseUrl: string;
  emailTransport: Transporter;
  guestRole?: Role | false;
};

@Module({})
export class CaliobaseConfigModule {
  static async forRootAsync({
    baseUrl,
    emailTransport,
    guestRole = 'guest',
  }: CaliobaseConfigModuleOptions): Promise<DynamicModule> {
    const configProvider: Provider<CaliobaseConfig> = {
      provide: CaliobaseConfig,
      useValue: new CaliobaseConfig({
        baseUrl,
        emailTransport,
        guestRole,
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
